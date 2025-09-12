import { Container } from "@cloudflare/containers";
import { env as workerEnv } from "cloudflare:workers";

export class MyContainer extends Container {
  defaultPort = 8080;   // Express app listens on port 8080
  sleepAfter = "10m";   // Stop container after 10 minutes of inactivity
  
  // Optional: Configure container resources
  cpu = "1000m";        // 1 CPU core
  memory = "1Gi";       // 1GB memory
  envVars = {
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    PORT: "8080",
    FYND_API_BASE_URL: workerEnv.FYND_API_BASE_URL,
    FYND_AUTH_TOKEN: workerEnv.FYND_AUTH_TOKEN, // from `wrangler secret put`
  };
}

export default {
  async fetch(request, env) {
    try {
      // Quick sanity check endpoint to verify Worker routing
      const { pathname } = new URL(request.url);
      if (pathname === '/__worker_ok') {
        return new Response('worker: ok', { status: 200 });
      }

      // Get or create a container instance
      const container = env.MY_CONTAINER.getByName("default");
      
      // Forward the request to the Express app running in the container
      const response = await container.fetch(request);
      
      // Add custom headers for debugging (optional)
      const headers = new Headers(response.headers);
      headers.set('X-Container-Instance', 'fynd-storefront-ssr');
      headers.set('X-Powered-By', 'Cloudflare-Containers');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
      
    } catch (error) {
      console.error('Container fetch error:', error);
      
      // Return a proper error response
      return new Response(
        JSON.stringify({
          error: 'Container service unavailable',
          message: error.message,
          timestamp: new Date().toISOString()
        }), 
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Error-Source': 'cf-worker'
          }
        }
      );
    }
  }
};
