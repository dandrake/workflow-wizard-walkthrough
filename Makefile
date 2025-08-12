PRETTIER_FILES := $(wildcard *.html *.js *.css *.json)

.PHONY: prettier check-prettier

prettier:
	@echo "Running Prettier, overwriting files!"
	prettier --write $(PRETTIER_FILES)

check-prettier:
	@echo "Running Prettier to check formatting."
	prettier --check $(PRETTIER_FILES)
