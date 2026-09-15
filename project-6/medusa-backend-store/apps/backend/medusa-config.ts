// import { loadEnv, defineConfig } from '@medusajs/framework/utils'

// loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// module.exports = defineConfig({
//   projectConfig: {
//     databaseUrl: process.env.DATABASE_URL,
    // http: {
    //   storeCors: process.env.STORE_CORS!,
    //   adminCors: process.env.ADMIN_CORS!,
    //   authCors: process.env.AUTH_CORS!,
    //   jwtSecret: process.env.JWT_SECRET,
    //   cookieSecret: process.env.COOKIE_SECRET,
    // }
//   }
// })

import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {

    // ...
    databaseSchema: process.env.POSTGRES_SCHEMA,
    databaseDriverOptions: {
      ssl: false,
      sslmode: "disable",
      
      connection: {
        ssl: { rejectUnauthorized: false } 
      }

    },
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  admin: {
    vite: (config) => {
      return {
        server: {
          host: "0.0.0.0",
          allowedHosts: ["localhost", ".localhost", "127.0.0.1", "192.168.0.26"],
          hmr: {
            port: 5173,
            clientPort: 5173,
          },
        },
      }
    },
  },
})