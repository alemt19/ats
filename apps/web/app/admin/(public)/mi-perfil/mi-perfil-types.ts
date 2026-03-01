export type AdminProfileRoleOption = {
  technical_name: string
  display_name: string
}

export type AdminProfileStateOption = {
  name: string
  cities: string[]
}

export type AdminProfileCatalogsResponse = {
  country: string
  country_phone_prefix: string
  roles: AdminProfileRoleOption[]
  states: AdminProfileStateOption[]
}

export type AdminProfile = {
  id: number
  profile_picture: string
  name: string
  lastname: string
  email: string
  dni: string
  phone: string
  role: string
  country: string
  state: string
  city: string
  address: string
}

export type AdminProfilePayload = {
  profile_picture?: string
  name: string
  lastname: string
  dni: string
  phone: string
  phone_prefix: string
  state: string
  city: string
  address: string
}
