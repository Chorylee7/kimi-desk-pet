#!/bin/sh
# Kimi Code Desktop 从 Dock/Finder 启动时 PATH 是 GUI 最小环境，
# 通常找不到 nvm/homebrew 装的 node。这里补常见安装路径再 exec。
if ! command -v node >/dev/null 2>&1; then
  for d in \
    /opt/homebrew/bin \
    /usr/local/bin \
    "$HOME/.volta/bin" \
    "$HOME/.local/bin" \
    "$HOME/.asdf/shims" \
    "$HOME/.bun/bin" \
    "$HOME/.fnm/aliases/default/bin" \
    "$HOME/.nvm/versions/node/"*/bin
  do
    if [ -x "$d/node" ]; then
      PATH="$d:$PATH"
      export PATH
      break
    fi
  done
fi
exec node "$@"
