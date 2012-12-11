
#
# Lint JavaScripts by JsHint
#

LINT_BIN = ./node_modules/.bin/jshint
LINT_CLIENT_CONFIG = ./fixtures/jshint-config.js
LINT_TARGETS = backbone.buffer-collection.js

lint: $(LINT_TARGETS)
	@$(LINT_BIN) --config $(LINT_CLIENT_CONFIG) $^
	@echo "lint ok"

.PHONY: lint