.PHONY: build dist test dist-package

PACKAGE_VERSION=$(shell cat package.json | grep version | head -1 | awk -F: '{ print $$2 }' | sed 's/[ ",]//g')

build: clean test dist

dist:
	grunt

dist-package: dist
	tar -czf spotboard-webapp-$(PACKAGE_VERSION).tar.gz --transform 's,^dist,spotboard-webapp-$(PACKAGE_VERSION),' dist
	echo spotboard-webapp-$(PACKAGE_VERSION).tar.gz

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
	rm -rf spotboard-*.tar.gz
	rm -rf dist/
