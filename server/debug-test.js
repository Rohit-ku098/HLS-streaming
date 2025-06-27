// // Debug script to test the server endpoints
// const http = require("http");

// // Test 1: Basic server health check
// function testHealthCheck() {
//   console.log("Testing health check endpoint...");

//   const options = {
//     hostname: "localhost",
//     port: 3000,
//     path: "/",
//     method: "GET",
//   };

//   const req = http.request(options, (res) => {
//     console.log(`Health check status: ${res.statusCode}`);
//     let data = "";

//     res.on("data", (chunk) => {
//       data += chunk;
//     });

//     res.on("end", () => {
//       console.log("Health check response:", data);
//       testEndpoint();
//     });
//   });

//   req.on("error", (e) => {
//     console.error(`Health check error: ${e.message}`);
//   });

//   req.end();
// }

// // Test 2: Test endpoint
// function testEndpoint() {
//   console.log("\nTesting test endpoint...");

//   const options = {
//     hostname: "localhost",
//     port: 3000,
//     path: "/test",
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   };

//   const req = http.request(options, (res) => {
//     console.log(`Test endpoint status: ${res.statusCode}`);
//     let data = "";

//     res.on("data", (chunk) => {
//       data += chunk;
//     });

//     res.on("end", () => {
//       console.log("Test endpoint response:", data);
//       console.log("\nIf both tests pass, the server is working correctly.");
//       console.log("Check the browser console for client-side errors.");
//     });
//   });

//   req.on("error", (e) => {
//     console.error(`Test endpoint error: ${e.message}`);
//   });

//   req.end();
// }

// // Start tests
// console.log("Starting server tests...");
// testHealthCheck();
