import { logout } from '../../lib/auth.server'
export const action = ({ request }) => logout(request)
export const loader = ({ request }) => logout(request)
