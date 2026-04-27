# Managerial-Accounting

# Usefull commands

#### used to kill all npm servers

lsof -ti :5173,:5174,:5175,:5176 | xargs kill -9 2>/dev/null; pkill -9 -f "vite" 2>/dev/null; pkill -9 -f "node" 2>/dev/null; echo "done"

Type killnode in terminal to clean up, the following command was used to accomplish this.
echo 'alias killnode="lsof -ti :5173,:5174,:5175,:5176 | xargs kill -9 2>/dev/null; pkill -9 -f vite 2>/dev/null; pkill -9 -f node 2>/dev/null; echo done"' >> ~/.zshrc && source ~/.zshrc
