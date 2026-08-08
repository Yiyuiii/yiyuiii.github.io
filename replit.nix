{ pkgs }:

{
  deps = [
    pkgs.ruby_3_3
    pkgs.git
    pkgs.gcc
    pkgs.gnumake
    pkgs.pkg-config
    pkgs.zlib
  ];
}
