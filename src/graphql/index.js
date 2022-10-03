
const { ApolloServer } = require('apollo-server-express')
const {
  ApolloServerPluginLandingPageGraphQLPlayground
} = require('apollo-server-core')

const http = require('http')
const express = require('express')
const { promisify } = require('util')

const typeDefs = require('./typeDefs')
const SSBResolvers = require('./resolvers/ssb')

module.exports = async function graphqlServer (opts = { port: 4000 }, cb) {
  if (cb === undefined) return promisify(graphqlServer)(opts)

  const app = express()
  const httpServer = http.createServer(app)
  const { ssb, resolvers } = SSBResolvers()

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginLandingPageGraphQLPlayground({ httpServer }),
      {
        async serverWillStart () {
          return {
            async serverWillStop () {
              ssb.close()
            }
          }
        }
      }
    ]
  })

  ssb.close.hook((close, args) => {
    httpServer.close()
    close(...args)
  })

  apolloServer.start()
    .then(() => {
      apolloServer.applyMiddleware({ app })

      httpServer.listen(opts.port, (err) => {
        if (err) return cb(err)

        console.log(`🚀 Server ready at http://localhost:${opts.port}${apolloServer.graphqlPath}`)

        cb(null, { apolloServer, ssb })
      })
    })
}
