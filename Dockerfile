FROM nixos/nix

# Setup repo
WORKDIR /poll
COPY . .

# Enable nix and flakes
RUN mkdir -p ~/.config/nix
RUN echo "experimental-features = nix-command flakes" | tee ~/.config/nix/nix.conf

# Build server
RUN nix build
RUN mkdir -p data

CMD ./result/bin/cubes-server /pool/data/server.sock
