import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  rates: ShippingRate[];
}

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
  minWeight?: number;
  maxWeight?: number;
  estimatedDays: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()
    
    const SHOPIFY_STORE = Deno.env.get('SHOPIFY_STORE')
    const SHOPIFY_TOKEN = Deno.env.get('SHOPIFY_TOKEN')
    
    if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
      throw new Error('Shopify credentials not configured')
    }

    const shopifyUrl = `https://${SHOPIFY_STORE}/admin/api/2024-07/graphql.json`
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    }

    switch (action) {
      case 'getDeliveryProfiles':
        return await getDeliveryProfiles(shopifyUrl, headers)
      
      case 'updateShippingRate':
        return await updateShippingRate(shopifyUrl, headers, data)
      
      case 'createShippingRate':
        return await createShippingRate(shopifyUrl, headers, data)
      
      case 'deleteShippingRate':
        return await deleteShippingRate(shopifyUrl, headers, data)
      
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function getDeliveryProfiles(shopifyUrl: string, headers: Record<string, string>) {
  // Query with weight conditions from Shopify
  // Using smaller pagination limits to stay within Shopify's query cost limit (1000)
  const query = `
    query {
      deliveryProfiles(first: 3) {
        edges {
          node {
            id
            name
            profileLocationGroups {
              locationGroup {
                id
              }
              locationGroupZones(first: 100) {
                edges {
                  node {
                    zone {
                      id
                      name
                      countries {
                        code {
                          countryCode
                        }
                        name
                      }
                    }
                    methodDefinitions(first: 20) {
                      edges {
                        node {
                          id
                          name
                          active
                          methodConditions {
                            id
                            conditionCriteria {
                              ... on Weight {
                                unit
                                value
                              }
                            }
                            field
                            operator
                          }
                          rateProvider {
                            ... on DeliveryRateDefinition {
                              id
                              price {
                                amount
                                currencyCode
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const response = await fetch(shopifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  })

  const result = await response.json()
  
  console.log('Shopify API response received')
  
  if (result.errors) {
    console.error('Shopify errors:', result.errors)
    throw new Error(result.errors[0].message)
  }

  // Transform Shopify data to our format
  const zones: ShippingZone[] = []
  
  result.data.deliveryProfiles.edges.forEach((profileEdge: any) => {
    const profile = profileEdge.node
    
    profile.profileLocationGroups.forEach((locationGroup: any) => {
      locationGroup.locationGroupZones.edges.forEach((zoneEdge: any) => {
        const zone = zoneEdge.node.zone
        const methods = zoneEdge.node.methodDefinitions.edges
        
        const rates: ShippingRate[] = methods
          .filter((methodEdge: any) => methodEdge.node.active)
          .map((methodEdge: any) => {
            const method = methodEdge.node
            
            // Extract weight conditions from Shopify
            let minWeight: number | undefined = undefined
            let maxWeight: number | undefined = undefined
            const weightConditionIds: string[] = []
            
            if (method.methodConditions) {
              method.methodConditions.forEach((condition: any) => {
                if (condition.field === 'TOTAL_WEIGHT') {
                  weightConditionIds.push(condition.id)
                  const weightValue = condition.conditionCriteria?.value
                  if (weightValue !== undefined) {
                    if (condition.operator === 'GREATER_THAN_OR_EQUAL_TO') {
                      minWeight = weightValue
                    } else if (condition.operator === 'LESS_THAN_OR_EQUAL_TO') {
                      maxWeight = weightValue
                    }
                  }
                }
              })
            }
            
            return {
              id: method.id,
              name: method.name,
              price: method.rateProvider?.price ? parseFloat(method.rateProvider.price.amount) : 0,
              currency: method.rateProvider?.price?.currencyCode || 'USD',
              description: `Shipping method for ${zone.name}`,
              estimatedDays: '',
              minWeight,
              maxWeight,
              weightConditionIds,
            }
          })

        // Use country name if zone has only 1 country, otherwise use zone name
        const countryNames = zone.countries.map((country: any) => country.name)
        const displayName = countryNames.length === 1 
          ? countryNames[0] 
          : zone.name

        zones.push({
          id: zone.id,
          name: displayName,
          countries: zone.countries.map((country: any) => country.code.countryCode),
          countryNames: countryNames,
          rates,
        })
      })
    })
  })

  console.log(`Total zones fetched: ${zones.length}`)
  console.log('Zone names:', zones.map(z => z.name).join(', '))

  return new Response(
    JSON.stringify({ zones }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function updateShippingRate(
  shopifyUrl: string, 
  headers: Record<string, string>, 
  data: { 
    deliveryProfileId: string;
    locationGroupId: string;
    zoneId: string;
    methodId: string;
    rate: ShippingRate & { weightConditionIds?: string[] };
  }
) {
  console.log('Updating shipping rate:', JSON.stringify(data, null, 2))
  
  // Check if we need to update weight conditions
  const hasNewWeights = (data.rate.minWeight !== undefined && data.rate.minWeight !== null) ||
                        (data.rate.maxWeight !== undefined && data.rate.maxWeight !== null)
  
  // First, get the delivery profiles to find the correct structure
  const profileQuery = `
    query {
      deliveryProfiles(first: 5) {
        edges {
          node {
            id
            profileLocationGroups {
              locationGroup {
                id
              }
              locationGroupZones(first: 50) {
                edges {
                  node {
                    zone {
                      id
                    }
                    methodDefinitions(first: 20) {
                      edges {
                        node {
                          id
                          methodConditions {
                            id
                            field
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const profileResponse = await fetch(shopifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: profileQuery }),
  })

  const profileResult = await profileResponse.json()
  
  if (profileResult.errors) {
    console.error('Profile query errors:', profileResult.errors)
    throw new Error(profileResult.errors[0].message)
  }

  // Find the correct profile, location group, and check for existing conditions
  let foundProfile = null
  let foundLocationGroup = null
  let hasExistingConditions = false

  for (const profileEdge of profileResult.data.deliveryProfiles.edges) {
    const profile = profileEdge.node
    for (const locationGroup of profile.profileLocationGroups) {
      for (const zoneEdge of locationGroup.locationGroupZones.edges) {
        if (zoneEdge.node.zone.id === data.zoneId) {
          foundProfile = profile.id
          foundLocationGroup = locationGroup.locationGroup.id
          
          // Check if method has existing conditions
          const method = zoneEdge.node.methodDefinitions.edges.find(
            (m: any) => m.node.id === data.methodId
          )
          if (method?.node?.methodConditions?.length > 0) {
            hasExistingConditions = true
          }
          break
        }
      }
      if (foundProfile) break
    }
    if (foundProfile) break
  }

  if (!foundProfile || !foundLocationGroup) {
    throw new Error(`Could not find delivery profile structure for zone ${data.zoneId}`)
  }

  console.log('Found profile:', foundProfile)
  console.log('Found location group:', foundLocationGroup)
  console.log('Has existing conditions:', hasExistingConditions)
  console.log('Has new weights:', hasNewWeights)

  const mutation = `
    mutation deliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
      deliveryProfileUpdate(id: $id, profile: $profile) {
        profile {
          id
          name
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  // If weights need to change and there are existing conditions, 
  // we must delete and recreate the method
  if (hasNewWeights && hasExistingConditions) {
    console.log('Deleting and recreating method to update weight conditions')
    
    // Build weight conditions for new method
    const weightConditionsToCreate = []
    if (data.rate.minWeight !== undefined && data.rate.minWeight !== null) {
      weightConditionsToCreate.push({
        criteria: { unit: "KILOGRAMS", value: data.rate.minWeight },
        operator: "GREATER_THAN_OR_EQUAL_TO"
      })
    }
    if (data.rate.maxWeight !== undefined && data.rate.maxWeight !== null) {
      weightConditionsToCreate.push({
        criteria: { unit: "KILOGRAMS", value: data.rate.maxWeight },
        operator: "LESS_THAN_OR_EQUAL_TO"
      })
    }

    // Delete old method and create new one in single mutation
    // Note: methodDefinitionsToDelete goes at profile level, not zone level
    const variables = {
      id: foundProfile,
      profile: {
        methodDefinitionsToDelete: [data.methodId],
        locationGroupsToUpdate: [
          {
            id: foundLocationGroup,
            zonesToUpdate: [
              {
                id: data.zoneId,
                methodDefinitionsToCreate: [
                  {
                    name: data.rate.name,
                    description: data.rate.description || '',
                    active: true,
                    rateDefinition: {
                      price: {
                        amount: data.rate.price.toString(),
                        currencyCode: data.rate.currency
                      }
                    },
                    weightConditionsToCreate
                  }
                ]
              }
            ]
          }
        ]
      }
    }

    console.log('Delete+Create mutation variables:', JSON.stringify(variables, null, 2))

    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: mutation, variables }),
    })

    const result = await response.json()
    console.log('Mutation result:', JSON.stringify(result, null, 2))

    if (result.errors) {
      console.error('Mutation errors:', result.errors)
      throw new Error(result.errors[0].message)
    }

    if (result.data.deliveryProfileUpdate.userErrors.length > 0) {
      console.error('User errors:', result.data.deliveryProfileUpdate.userErrors)
      throw new Error(result.data.deliveryProfileUpdate.userErrors[0].message)
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data.deliveryProfileUpdate.profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Standard update without weight changes, or adding weights to method with no conditions
  const methodDefinitionUpdate: any = {
    id: data.methodId,
    name: data.rate.name,
    description: data.rate.description,
    rateDefinition: {
      price: {
        amount: data.rate.price.toString(),
        currencyCode: data.rate.currency
      }
    }
  }

  // Only add weight conditions if there are no existing conditions
  if (hasNewWeights && !hasExistingConditions) {
    const weightConditionsToCreate = []
    if (data.rate.minWeight !== undefined && data.rate.minWeight !== null) {
      weightConditionsToCreate.push({
        criteria: { unit: "KILOGRAMS", value: data.rate.minWeight },
        operator: "GREATER_THAN_OR_EQUAL_TO"
      })
    }
    if (data.rate.maxWeight !== undefined && data.rate.maxWeight !== null) {
      weightConditionsToCreate.push({
        criteria: { unit: "KILOGRAMS", value: data.rate.maxWeight },
        operator: "LESS_THAN_OR_EQUAL_TO"
      })
    }
    if (weightConditionsToCreate.length > 0) {
      methodDefinitionUpdate.weightConditionsToCreate = weightConditionsToCreate
    }
  }

  const variables = {
    id: foundProfile,
    profile: {
      locationGroupsToUpdate: [
        {
          id: foundLocationGroup,
          zonesToUpdate: [
            {
              id: data.zoneId,
              methodDefinitionsToUpdate: [methodDefinitionUpdate]
            }
          ]
        }
      ]
    }
  }

  console.log('Update mutation variables:', JSON.stringify(variables, null, 2))

  const response = await fetch(shopifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: mutation, variables }),
  })

  const result = await response.json()
  console.log('Mutation result:', JSON.stringify(result, null, 2))

  if (result.errors) {
    console.error('Mutation errors:', result.errors)
    throw new Error(result.errors[0].message)
  }

  if (result.data.deliveryProfileUpdate.userErrors.length > 0) {
    console.error('User errors:', result.data.deliveryProfileUpdate.userErrors)
    throw new Error(result.data.deliveryProfileUpdate.userErrors[0].message)
  }

  return new Response(
    JSON.stringify({ success: true, data: result.data.deliveryProfileUpdate.profile }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createShippingRate(
  shopifyUrl: string, 
  headers: Record<string, string>, 
  data: { 
    zoneId: string;
    rate: {
      name: string;
      price: number;
      currency: string;
      description?: string;
      minWeight?: number;
      maxWeight?: number;
    };
  }
) {
  console.log('Creating shipping rate:', JSON.stringify(data, null, 2))
  
  // First, get the delivery profiles to find the correct structure
  // Using smaller pagination limits to stay within Shopify's query cost limit (1000)
  const profileQuery = `
    query {
      deliveryProfiles(first: 5) {
        edges {
          node {
            id
            profileLocationGroups {
              locationGroup {
                id
              }
              locationGroupZones(first: 50) {
                edges {
                  node {
                    zone {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const profileResponse = await fetch(shopifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: profileQuery }),
  })

  const profileResult = await profileResponse.json()
  
  if (profileResult.errors) {
    console.error('Profile query errors:', profileResult.errors)
    throw new Error(profileResult.errors[0].message)
  }

  // Find the correct profile and location group for this zone
  let foundProfile = null
  let foundLocationGroup = null

  for (const profileEdge of profileResult.data.deliveryProfiles.edges) {
    const profile = profileEdge.node
    for (const locationGroup of profile.profileLocationGroups) {
      for (const zoneEdge of locationGroup.locationGroupZones.edges) {
        if (zoneEdge.node.zone.id === data.zoneId) {
          foundProfile = profile.id
          foundLocationGroup = locationGroup.locationGroup.id
          break
        }
      }
      if (foundLocationGroup) break
    }
    if (foundLocationGroup) break
  }

  if (!foundProfile || !foundLocationGroup) {
    throw new Error(`Could not find delivery profile structure for zone ${data.zoneId}`)
  }

  console.log('Found profile:', foundProfile)
  console.log('Found location group:', foundLocationGroup)

  const mutation = `
    mutation deliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
      deliveryProfileUpdate(id: $id, profile: $profile) {
        profile {
          id
          name
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  // Build the rate definition with optional weight conditions
  const rateDefinition: any = {
    price: {
      amount: data.rate.price.toString(),
      currencyCode: data.rate.currency
    }
  }

  const methodDefinition: any = {
    name: data.rate.name,
    description: data.rate.description || '',
    active: true,
    rateDefinition
  }

  // Add weight conditions if provided
  if (data.rate.minWeight !== undefined || data.rate.maxWeight !== undefined) {
    methodDefinition.weightConditionsToCreate = []
    
    if (data.rate.minWeight !== undefined) {
      methodDefinition.weightConditionsToCreate.push({
        criteria: {
          unit: "KILOGRAMS",
          value: data.rate.minWeight
        },
        operator: "GREATER_THAN_OR_EQUAL_TO"
      })
    }
    
    if (data.rate.maxWeight !== undefined) {
      methodDefinition.weightConditionsToCreate.push({
        criteria: {
          unit: "KILOGRAMS",
          value: data.rate.maxWeight
        },
        operator: "LESS_THAN_OR_EQUAL_TO"
      })
    }
  }

  const variables = {
    id: foundProfile,
    profile: {
      locationGroupsToUpdate: [
        {
          id: foundLocationGroup,
          zonesToUpdate: [
            {
              id: data.zoneId,
              methodDefinitionsToCreate: [methodDefinition]
            }
          ]
        }
      ]
    }
  }

  console.log('Create mutation variables:', JSON.stringify(variables, null, 2))

  const response = await fetch(shopifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: mutation, variables }),
  })

  const result = await response.json()
  
  console.log('Create mutation result:', JSON.stringify(result, null, 2))
  
  if (result.errors) {
    console.error('Mutation errors:', result.errors)
    throw new Error(result.errors[0].message)
  }

  if (result.data.deliveryProfileUpdate.userErrors.length > 0) {
    console.error('User errors:', result.data.deliveryProfileUpdate.userErrors)
    throw new Error(result.data.deliveryProfileUpdate.userErrors[0].message)
  }

  return new Response(
    JSON.stringify({ success: true, data: result.data.deliveryProfileUpdate.profile }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function deleteShippingRate(
  shopifyUrl: string, 
  headers: Record<string, string>, 
  data: { 
    zoneId: string;
    methodId: string;
  }
) {
  console.log('Deleting shipping rate:', JSON.stringify(data, null, 2))
  
  // First, get the delivery profiles to find the correct structure
  // Using smaller pagination limits to stay within Shopify's query cost limit (1000)
  const profileQuery = `
    query {
      deliveryProfiles(first: 5) {
        edges {
          node {
            id
            profileLocationGroups {
              locationGroup {
                id
              }
              locationGroupZones(first: 50) {
                edges {
                  node {
                    zone {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const profileResponse = await fetch(shopifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: profileQuery }),
  })

  const profileResult = await profileResponse.json()
  
  if (profileResult.errors) {
    console.error('Profile query errors:', profileResult.errors)
    throw new Error(profileResult.errors[0].message)
  }

  // Find the correct profile and location group for this zone
  let foundProfile = null
  let foundLocationGroup = null

  for (const profileEdge of profileResult.data.deliveryProfiles.edges) {
    const profile = profileEdge.node
    for (const locationGroup of profile.profileLocationGroups) {
      for (const zoneEdge of locationGroup.locationGroupZones.edges) {
        if (zoneEdge.node.zone.id === data.zoneId) {
          foundProfile = profile.id
          foundLocationGroup = locationGroup.locationGroup.id
          break
        }
      }
      if (foundLocationGroup) break
    }
    if (foundLocationGroup) break
  }

  if (!foundProfile || !foundLocationGroup) {
    throw new Error(`Could not find delivery profile structure for zone ${data.zoneId}`)
  }

  const mutation = `
    mutation deliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
      deliveryProfileUpdate(id: $id, profile: $profile) {
        profile {
          id
          name
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  // Note: methodDefinitionsToDelete goes at profile level, not zone level
  const variables = {
    id: foundProfile,
    profile: {
      methodDefinitionsToDelete: [data.methodId]
    }
  }

  console.log('Delete mutation variables:', JSON.stringify(variables, null, 2))

  const response = await fetch(shopifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: mutation, variables }),
  })

  const result = await response.json()
  
  console.log('Delete mutation result:', JSON.stringify(result, null, 2))
  
  if (result.errors) {
    console.error('Mutation errors:', result.errors)
    throw new Error(result.errors[0].message)
  }

  if (result.data.deliveryProfileUpdate.userErrors.length > 0) {
    console.error('User errors:', result.data.deliveryProfileUpdate.userErrors)
    throw new Error(result.data.deliveryProfileUpdate.userErrors[0].message)
  }

  return new Response(
    JSON.stringify({ success: true, data: result.data.deliveryProfileUpdate.profile }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
