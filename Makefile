V_BIN = venv/bin

ENV = .flaskenv

SERVER_CMD = $(V_BIN)/uvicorn
SERVER_ARGS =


all: run

$(V_BIN):
	@ python3 -m venv venv
	@ chmod +x $(V_BIN)/activate
	@ ./$(V_BIN)/activate

$(ENV):
	@ echo 'DEBUG_MODE=false' > $(ENV)

$(SERVER_CMD): $(V_BIN) $(ENV)
	@ $(V_BIN)/pip install -r requirements.txt

run: $(SERVER_CMD)
	@ $(SERVER_CMD) wsgi:app $(SERVER_ARGS)

dev: SERVER_ARGS += --reload
dev: run

.PHONY: run dev

clean:
	@ $(RM) -r */__pycache__
	@ $(RM) .flaskenv

fclean: clean
	@ $(RM) -r venv

.PHONY: clean fclean
