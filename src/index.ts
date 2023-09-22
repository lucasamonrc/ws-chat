import { ServerWebSocket } from "bun";
import { randomBytes } from "node:crypto";

interface WebSocket {
    sid: string;
}

const users: ServerWebSocket<WebSocket>[] = [];

const server = Bun.serve<WebSocket>({
    port: 8080,
    async fetch(req, server) {
        const url = new URL(req.url);

        if (url.pathname === "/styles.css") {
            return new Response(Bun.file("public/styles.css"), {
                headers: {
                    "Content-Type": "text/css",
                },
            });
        }

        if (url.pathname === "/") {
            return new Response(Bun.file("public/index.html"), {
                headers: {
                    "Content-Type": "text/html",
                },
            });
        }

        if (url.pathname === "/chat") {
            server.upgrade(req, {
                data: {
                    sid: "",
                },
            });
            return;
        }

        return new Response("Not Found", { status: 404 });
    },
    websocket: {
        message(ws, msg) {
            const data = JSON.parse(msg.toString());
            const message = JSON.stringify({
                sid: ws.data.sid,
                msg: data.msg,
            });

            users.forEach((user) => {
                if (user.data.sid !== ws.data.sid) {
                    user.send(message);
                }
            });
        },
        open(ws) {
            ws.data.sid = randomBytes(4).toString("hex");
            users.push(ws);
            users.forEach((user) =>
                user.send(
                    JSON.stringify({
                        sid: "server",
                        msg: `${ws.data.sid} joined the chat`,
                    })
                )
            );
        },
        close(ws) {
            const sid = ws.data.sid;
            users.filter((user) => user.data.sid !== sid);
            users.forEach((user) =>
                user.send(
                    JSON.stringify({
                        sid: ws.data.sid,
                        msg: `${ws.data.sid} left the chat`,
                    })
                )
            );
        },
        drain(ws) {},
    },
});
