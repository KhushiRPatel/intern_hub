import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token       = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const adminSecret = process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || '';

  return {
    headers: {
      ...headers,
      ...(token
        ? { Authorization: `Bearer ${token}` }      // JWT → Hasura reads role, applies row filters
        : adminSecret
          ? { 'x-hasura-admin-secret': adminSecret } // fallback for unauthenticated dev requests
          : {}),
    },
  };
});

const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query:      { errorPolicy: 'all' },
  },
});

export default apolloClient;