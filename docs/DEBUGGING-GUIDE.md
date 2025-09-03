# Debugging Guide

## VS Code Debugging Setup

This project is configured with multiple debugging options for VS Code. Here's how to use them:

## 🚀 Quick Start

### Method 1: Debug with TSX (Recommended)
1. Open VS Code
2. Press `F5` or go to Run → Start Debugging
3. Select **"Debug with TSX"** from the dropdown
4. The server will start with debugging enabled
5. Set breakpoints by clicking on the left margin of any TypeScript file
6. Navigate to http://localhost:3000 to trigger your breakpoints

### Method 2: Attach to Running Server
1. Start the debug server in terminal:
   ```bash
   npm run dev:debug
   ```
2. In VS Code, press `F5` and select **"Attach to Running Server"**
3. The debugger will attach to the running process

## 📍 Setting Breakpoints

### In TypeScript Files
1. Open any `.ts` file (e.g., `src/services/auth.ts`)
2. Click in the left margin next to the line number
3. A red dot will appear indicating a breakpoint
4. When code execution reaches that line, it will pause

### Common Debugging Points

Add breakpoints in these files for authentication debugging:
- `src/services/auth.ts` - Line 33-50 (OTP sending)
- `src/controllers/auth.ts` - API endpoints
- `src/lib/apollo.ts` - GraphQL requests
- `src/middlewares/auth.ts` - Authentication middleware

## 🔧 Debug Configurations

### Available Launch Configurations

1. **Debug Dev Server** - Launches the dev server with debugging
2. **Attach to Running Server** - Attaches to an already running debug server
3. **Debug Current TS File** - Debugs the currently open TypeScript file
4. **Debug with TSX** - Uses tsx to run and debug (fastest)
5. **Debug Jest Tests** - Debugs unit tests
6. **Debug in Chrome** - Debugs client-side JavaScript
7. **Full Stack Debug** - Debugs both server and client simultaneously

## 🛠️ Debug Commands

### Terminal Commands
```bash
# Start server with debugging on port 9229
npm run debug

# Start dev server with debugging and watch mode
npm run dev:debug

# Normal dev mode (no debugging)
npm run dev
```

### Using Chrome DevTools
1. Start the server with debugging:
   ```bash
   npm run debug
   ```
2. Open Chrome and navigate to: `chrome://inspect`
3. Click "Open dedicated DevTools for Node"
4. Your breakpoints will work in Chrome DevTools

## 📊 Debug Panel Features

### Variables Panel
- **Locals**: Shows variables in current scope
- **Closure**: Shows variables from parent scopes
- **Global**: Shows global variables

### Watch Panel
Add expressions to watch their values:
- `context.traceId` - Current request trace ID
- `Config.applicationId` - Application configuration
- `process.env.FYND_AUTH_TOKEN` - Environment variables

### Call Stack Panel
Shows the execution path that led to the current breakpoint

### Debug Console
Execute JavaScript expressions in the current context:
```javascript
// Examples you can run in debug console:
console.log(data)
JSON.stringify(variables, null, 2)
Config.applicationId
context
```

## 🔍 Debugging Authentication Flow

### Example: Debug OTP Send
1. Set a breakpoint in `src/services/auth.ts` at line 34:
   ```typescript
   console.log('Sending OTP with platform ID:', PLATFORM_ID);
   ```

2. Start debugging with F5 → "Debug with TSX"

3. Navigate to http://localhost:3000/login

4. Enter phone number and submit

5. Debugger will pause at your breakpoint

6. In Debug Console, inspect variables:
   ```javascript
   mobile
   countryCode
   PLATFORM_ID
   context
   ```

### Example: Debug GraphQL Requests
1. Set breakpoint in `src/lib/apollo.ts` at the `executeQuery` method

2. Check the Debug Console for:
   - Query being executed
   - Variables being sent
   - Headers including auth token

## 🎯 Tips and Tricks

### Conditional Breakpoints
Right-click on a breakpoint and select "Edit Breakpoint":
```javascript
// Only break when mobile is specific number
mobile === "9999999999"

// Only break on errors
error !== undefined

// Break on specific platform
PLATFORM_ID === "67a9fef03076c6a7a761763f"
```

### Logpoints
Instead of adding console.log, right-click and add a logpoint:
- Message: `OTP sent to {mobile} with request ID {data.loginWithOTP.request_id}`
- This logs without stopping execution

### Exception Breakpoints
In Debug Panel → Breakpoints section:
- ✅ Uncaught Exceptions - Stops on unhandled errors
- ☐ Caught Exceptions - Stops on all errors (can be noisy)

## 🐛 Common Issues

### Breakpoints Not Working
1. Ensure sourcemaps are enabled in `tsconfig.json`
2. Clear dist folder: `rm -rf dist/`
3. Rebuild: `npm run build:ts`
4. Restart debugging

### Cannot Connect to Debug Port
1. Check if port 9229 is in use: `lsof -i :9229`
2. Kill existing process: `kill -9 <PID>`
3. Restart debugging

### Debugger Disconnects
1. Check for syntax errors in code
2. Ensure Node version compatibility
3. Try "Attach to Running Server" instead

## 📝 Debug Output Locations

### Console Logs
- VS Code Debug Console (when debugging)
- Terminal (always visible)

### Log Files
- Application logs: Check terminal output
- Error logs: Check terminal for stack traces

## 🎓 Advanced Debugging

### Memory Profiling
1. Start with: `node --inspect --max-old-space-size=4096 dist/server.js`
2. Open Chrome DevTools → Memory tab
3. Take heap snapshots to find memory leaks

### CPU Profiling
1. In Chrome DevTools → Profiler tab
2. Start recording
3. Perform actions
4. Stop recording and analyze flame chart

### Network Debugging
For GraphQL requests:
1. Set `DEBUG=apollo:*` environment variable
2. Check Network tab in Chrome DevTools
3. Look for `/graphql` requests

## 🔗 Useful Resources

- [VS Code Debugging Guide](https://code.visualstudio.com/docs/editor/debugging)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Chrome DevTools for Node](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27)
- [TypeScript Source Maps](https://www.typescriptlang.org/tsconfig#sourceMap)

## 💡 Pro Tips

1. **Use Debug Console for Quick Tests**: Test functions without modifying code
2. **Save Debug Configurations**: Export and share `.vscode/launch.json`
3. **Debug Production Builds**: Use `--inspect` with production build for real-world debugging
4. **Remote Debugging**: Use SSH tunneling for debugging remote servers
5. **Conditional Logging**: Use `Config.isDevelopment && console.log(...)` for dev-only logs

---

Happy Debugging! 🐞🔧
