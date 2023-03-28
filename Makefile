V_BIN = venv/bin

ENV = .flaskenv

GUNICORN_CMD = $(V_BIN)/gunicorn
GUNICORN_ARGS =


all: run

$(V_BIN):
	@ python3 -m venv venv
	@ chmod +x $(V_BIN)/activate
	@ ./$(V_BIN)/activate

$(ENV):
	@ echo 'DEBUG_MODE=false' > $(ENV)

$(GUNICORN_CMD): $(V_BIN) $(ENV)
	@ $(V_BIN)/pip install -r requirements.txt

run: $(GUNICORN_CMD)
	@ $(GUNICORN_CMD) wsgi:app $(GUNICORN_ARGS)

dev: GUNICORN_ARGS += --reload
dev: run

.PHONY: run dev

clean:
	@ $(RM) -r */__pycache__
	@ $(RM) .flaskenv

fclean: clean
	@ $(RM) -r venv

.PHONY: clean fclean
