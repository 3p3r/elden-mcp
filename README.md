# elden-mcp

Remote execution of MCP tools through Socket IO.

- [Summary](#summary)
- [Problem](#problem)
- [Solution](#solution)
- [Implementation](#implementation)
  - [Major Technologies](#major-technologies)
  - [Minor Technologies](#minor-technologies)

## Summary

This repository is an end-to-end solution offering remote execution capabilities for Model Context Protocol (MCP) tools via Socket.IO. It includes both server and client components, enabling seamless interaction with MCP tools over a network.

This implementation requires and enforces its users to authenticate using OpenID Connect (OIDC). The JWT token is both validated for authenticity and used to associate requests with specific users and their connected sockets.

This implementation allows one socket connection per valid JWT token.

The one socket connection's ID is exchanged in MCP calls to identify which client should execute the tool logic. This is
automatically added to the MCP tool registrations for you.

## Problem

Say you wanted to describe the following MCP tool and expose it to your AI agent:

```ts
// Confirm tool registered server-side
server.registerTool(
    'confirm',
    {
        title: 'Confirm Tool',
        description: 'Pops up for user confirmation',
        inputSchema: { message: z.string() },
        outputSchema: { result: z.boolean() }
    },
    // Confirm logic executed client-side
    async ({ message }) => {
        const output = new Promise<{ result: boolean }>((resolve) => {
            const confirmed = window.confirm(message);
            resolve({ result: confirmed });
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(output) }],
            structuredContent: output.result
        };
    }
);
```

This is normally not possible, yet usually needed for generative UI projects. The usage of `window.confirm` requires a browser context, which is not available server-side.

## Solution

With elden-mcp, you can register the tool server-side, but execute it client-side. The server will forward the tool execution request to the connected client, which will run the tool logic and return the result back to the server.

Internally, the tool function is "lifted" and replaced with a RPC call over Socket.IO. The client listens for tool execution requests, runs the tool logic, and sends the result back to the server.

Every RPC call has two halves, server and client. The other half of the RPC call is also automatically generated and can be used to expose the client-side logic.

## Implementation

Elden-mcp is implemented using the following stack:

### Major Technologies

- **Socket.IO**: For real-time, bidirectional communication between server and client.
- **MCP SDK**: For defining and executing Model Context Protocol tools.
- **Next.js**: For building both server and client components.
- **Better-Auth**: For handling OIDC authentication in Next.js.

### Minor Technologies

- **OpenID Connect (OIDC)**: For secure authentication and authorization.
- **Vite**: For fast development and build tooling.
- **Vitest**: For testing the implementation.
- **Biome**: For code formatting and linting.
- **React**: For building client-side user interfaces.
- **Node.js**: For server-side JavaScript runtime.
- **TypeScript**: For type safety and modern JavaScript features.
- **Zod**: For schema validation of tool inputs and outputs.
