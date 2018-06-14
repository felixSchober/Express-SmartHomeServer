module.exports = function(grunt) {
	"use strict";
	
	grunt.initConfig({
		copy: {
			build: {
				files: [
					{
						expand: true,
						cwd: "./public",								// copy public directory
						src: ["**"],
						dest: "./dist/public"
					},
					{
						expand: true,									// copy views directory
						cwd: "./views",
						src: ["**"],
						dest: "./dist/views"
					}
				]
			}
		},
		ts: { 															// compile typescript to dist folder
			app: {
				files: [{
					src: ["src/\*\*/\*.ts", "!src/.baseDir.ts"],
					dest: "./dist"
				}],
				options: {
					module: "commonjs",
					target: "es6",
					sourceMap: true,
					rootDir: "src"
				}
			}
		},
		watch: {														// watch for file changes
			ts: {
				files: ["src/\*\*/\*.ts"],
				tasks: ["ts"]
			},
			views: {
				files: ["views/**/*.pug"],
				tasks: ["copy"]
			}
		}
	});
	
	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-ts");
	
	grunt.registerTask("default", [
		"copy",
		"ts"
	]);
	
};