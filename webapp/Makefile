.PHONY: build dist test

build: clean test dist

dist:
	grunt

server:
	echo 'Launching Prod Server (dist/) ...'
	grunt server

dev:
	echo 'Launching Dev Server ...'
	grunt dev

test:
	mocha --compilers coffee:coffee-script/register

clean:
	rm -rf src/js/contest.js
	rm -rf dist/
