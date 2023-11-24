{
  outputs = { self, nixpkgs, }:
    let
      forAllSystems = function:
        nixpkgs.lib.genAttrs [
          "x86_64-linux"
          "aarch64-linux"
          "x86_64-darwin"
          "aarch64-darwin"
        ]
          (system: function nixpkgs.legacyPackages.${system});

      py = pkgs: rec {
        deps = p: with p; [ uvicorn ] ++ [ fastapi starlette gunicorn pydantic ];
        env = pkgs.python3.withPackages deps;
      };
    in
    {
      devShells = forAllSystems (pkgs: {
        default =
          let
            pyenv = (py pkgs).env;
          in
          pkgs.mkShell {
            buildIputs = [ pyenv ] ++ [ pkgs.docker pkgs.docker-compose ];

            shellHook = ''
              echo "python env path -> ${pyenv}"
            '';
          };
      });

      formatter = forAllSystems (pkgs: pkgs.nixpkgs-fmt);
      packages = forAllSystems (pkgs: rec {
        default = server;

        server =
          let pyenv = (py pkgs).env;
          in pkgs.stdenvNoCC.mkDerivation {
            name = "cubes-server";
            version = "1.0.0";

            src = pkgs.lib.cleanSource ./.;

            buildPhase = ''
              runHook preBuild

              cat <<EOF > runner_script
              #!${pkgs.runtimeShell}

              ${pyenv}/bin/gunicorn -k uvicorn.workers.UvicornWorker --bind unix:\$1 -m 007 wsgi:app
              EOF

              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              mkdir -p $out

              cp wsgi.py $out
              cp -r public $out
              cp -r server $out

              mkdir -p $out/bin
              cp runner_script $out/bin/cubes-server
              chmod +x $out/bin/cubes-server

              runHook postInstall
            '';
          };
      });
    };
}
