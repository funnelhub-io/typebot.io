import { DefaultSession } from 'next-auth'

export type UserSession = {
  id: string
  name: string
  apiToken: string
  email: string
  image?: string
  currentWorkspace: {
    id: string
    name: string
    role: string
    accessType: string[]
  }
  preferredAppAppearance: string
}

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user: UserSession
  }
}
