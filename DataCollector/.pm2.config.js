// Used by PM2 for deployment
module.exports = {
    apps : [{
        cwd: __dirname,
        env: {
            NODE_ENV: "development"
          },
        exec_mode: 'cluster',
	name: "SimplFHIR",
	ignore_watch : ["node_modules", "log", "cache"],
        instances: 16,
	autorestart: true,
        name: "SimplFHIR",
        script: './src/server.js',
	out_file: './log/out.log',
	error_file: './log/err.log'
    }]
}
