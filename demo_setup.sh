#!/bin/bash
set -e
echo ""
echo "================================================"
echo "  Vernacular FD Advisor — Demo Day Setup"
echo "================================================"
echo ""

echo "Step 1: Starting Ollama..."
ollama serve &
OLLAMA_PID=$!
sleep 3

echo "Step 2: Pre-warming model (loading weights into RAM)..."
curl -s -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:7b","messages":[{"role":"user","content":"Hello"}],"stream":false}' \
  > /dev/null && echo "  Model loaded ✅" || echo "  Ollama not ready yet — wait 10s and retry"

echo ""
echo "Step 3: Starting RAG backend..."
# Activate the project's virtualenv if one exists. Fall back silently if not.
source .venv/bin/activate 2>/dev/null \
  || source venv/bin/activate 2>/dev/null \
  || true
# Run uvicorn from the project root so `rag_backend.main:app` resolves.
uvicorn rag_backend.main:app --port 8000 --host 0.0.0.0 &
FASTAPI_PID=$!
sleep 4

echo "Step 4: Health check..."
curl -s http://localhost:8000/api/health | python3 -m json.tool 2>/dev/null \
  || echo "  (health endpoint response above)"

echo ""
echo "Step 5: Starting Next.js..."
npm run dev &
NEXTJS_PID=$!

echo ""
echo "================================================"
echo "  All services started."
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000/api/health"
echo "  Ollama:    http://localhost:11434/api/tags"
echo "================================================"
echo ""
echo "  Next steps:"
echo "  1. Open http://localhost:3000/compare"
echo "  2. Pre-load Suryoday SFB + Ujjivan SFB in compare slots"
echo "  3. Run eval: cd rag_backend && python -m eval.run_eval"
echo "  4. Screenshot eval results"
echo ""
echo "  Demo queries: cat demo_queries.txt"
echo "================================================"
