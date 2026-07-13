#!/usr/bin/env bash
# Resume Neo4j Aura Free if paused — required for calendar, chat history, recorder reports.
set -euo pipefail

echo "Neo4j Aura instance: dcbff5fe"
echo ""
echo "If the app shows errors loading data, your Aura Free DB is likely PAUSED."
echo ""
echo "Fix (2 minutes):"
echo "  1. Open https://console.neo4j.io"
echo "  2. Sign in → select instance 'Free instance' (dcbff5fe)"
echo "  3. Click **Resume** and wait until status is Running"
echo "  4. Run:  npm run verify:neo4j"
echo "  5. Run:  npm run deploy:api"
echo ""
node -e "
const neo4j=require('neo4j-driver');
require('fs').readFileSync('.env','utf8').split('\n').forEach(l=>{
  const i=l.indexOf('='); if(i>0 && !l.startsWith('#')) process.env[l.slice(0,i)]=l.slice(i+1);
});
const d=neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USERNAME||'neo4j', process.env.NEO4J_PASSWORD));
d.verifyConnectivity().then(()=>{console.log('Aura is RUNNING — OK');return d.close()}).catch(e=>{console.log('Aura NOT reachable:', e.message.split('\n')[0]); process.exit(1)});
" 2>&1
