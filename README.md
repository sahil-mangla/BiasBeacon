# Bias Beacon 🕯️

Bias Beacon is a premium, ethics-driven platform designed to audit, visualize, and mitigate algorithmic bias in machine learning models. By combining high-fidelity data visualization with advanced fairness forecasting and real-time simulation, it provides a "Truth-Finding Studio" for data scientists and ethics leads.

## 🏗 Project Structure

To maintain a clean and scalable codebase, the project is structured as follows:

```text
BiasBeacon/
├── backend/              # FastAPI Production Backend
│   ├── main.py           # Entry point & Lifespan management
│   ├── routes/           # API Endpoint definitions
│   ├── controllers/      # Business logic & Cache management
│   ├── models/           # ML Logic & Fairness metrics (extracted from Notebook)
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Containerization for Cloud Run
└── frontend/             # Next.js Frontend
    ├── src/              # Source code
    ├── .env              # Backend configuration
    └── package.json      # Frontend dependencies
```

## 🚀 Getting Started

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   export PYTHONPATH=$PYTHONPATH:.
   python main.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🧠 Core Features
- **Fairness Pulse**: Real-time auditing of Disparate Impact and Equal Opportunity.
- **Drift Detection**: Advanced PSI and KS-tests to identify feature drift across demographic groups.
- **Simulation Studio**: Proactive bias mitigation using empathy-weighted re-balancing.
- **Financial Impact**: Cost estimation of maintaining biased vs. fair models.

---
*Created with care by the Bias Beacon Team.*
