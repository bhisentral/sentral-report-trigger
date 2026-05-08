// Vercel serverless function
// POST /api/trigger  { password, reportId }
// Reads ACCESS_PASSWORD and GH_TOKEN from Vercel env vars.

const REPORTS = {
  'pipeline': {
    label: '3P Pipeline Report',
    repo: 'bhisentral/sentral-pipeline-bot',
    workflow: 'weekly_pipeline.yml',
    ref: 'main',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, reportId } = req.body || {};

  if (!password || password !== process.env.ACCESS_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const report = REPORTS[reportId];
  if (!report) {
    return res.status(400).json({ error: 'Unknown report.' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server is missing GH_TOKEN env var.' });
  }

  try {
    // 1) Dispatch the workflow
    const dispatchUrl = `https://api.github.com/repos/${report.repo}/actions/workflows/${report.workflow}/dispatches`;
    const dispatchRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'sentral-report-trigger',
      },
      body: JSON.stringify({ ref: report.ref }),
    });

    if (dispatchRes.status === 401) {
      return res.status(500).json({ error: 'Server token is invalid. Contact admin.' });
    }
    if (dispatchRes.status === 404) {
      return res.status(500).json({ error: 'Workflow not found. Contact admin.' });
    }
    if (dispatchRes.status !== 204) {
      const txt = await dispatchRes.text();
      return res.status(500).json({ error: `GitHub dispatch failed: ${dispatchRes.status} ${txt}` });
    }

    // 2) Wait briefly, then look up the run we just kicked off
    await new Promise((r) => setTimeout(r, 5000));
    const runsUrl = `https://api.github.com/repos/${report.repo}/actions/workflows/${report.workflow}/runs?event=workflow_dispatch&per_page=1`;
    const runsRes = await fetch(runsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'sentral-report-trigger',
      },
    });
    const runsData = await runsRes.json();
    const run = runsData.workflow_runs && runsData.workflow_runs[0];

    return res.status(200).json({
      ok: true,
      label: report.label,
      run: run ? { number: run.run_number, url: run.html_url, started: run.created_at } : null,
    });
  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
