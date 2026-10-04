// Dependency free static file server for browser tests.
// NB: `file://` cannot be used for browser tests.
//     (fetch of external files is blocked by CORS, because origin is `null`)

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".gif": "image/gif",
};

export const startServer = async (rootDir) => {
  const server = http.createServer((req, res)=> {
    const relPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const file = path.resolve(rootDir, "." + (relPath === "/" ? "/index.html" : relPath));
    if (!file.startsWith(rootDir)) { // reject a path traversal
      res.writeHead(403, {"Content-Type": "text/plain"});
      res.end("forbidden");
      return;
    }
    fs.readFile(file, (err, data)=> {
      if (err) {
        res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
        res.end("not found");
        return;
      }
      res.writeHead(200, {"Content-Type": contentTypes[path.extname(file)] || "application/octet-stream"});
      res.end(data);
    });
  });
  await new Promise((resolve)=> server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/`,
    close: ()=> new Promise((resolve)=> server.close(resolve)),
  };
};
