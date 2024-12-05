import http.server
import ssl
import socketserver

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

# Server configuration
PORT = 8000
Handler = MyHandler

# Create the HTTPS server
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('localhost+1.pem', 'localhost+1-key.pem')

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    print(f"Serving at https://localhost:{PORT}")
    print(f"Also accessible at https://127.0.0.1:{PORT}")
    print(f"Or on your local network at https://<your-local-ip>:{PORT}")
    httpd.serve_forever()