import React, { useState, useEffect } from 'react';
import { Terminal, Database, Code2, Play, CheckCircle2, Copy, X } from 'lucide-react';

interface CodeEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeEngineModal: React.FC<CodeEngineModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'python' | 'firestore' | 'terminal' | 'rules'>('python');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [copied, setCopied] = useState(false);

  // Run test command on mount or button click
  const runPythonTest = async () => {
    setIsRunningTest(true);
    setTestOutput(null);
    try {
      const res = await fetch('/api/engine/test');
      const data = await res.json();
      setTestOutput(data.stdout || data.stderr || 'Python process completed.');
    } catch (err: any) {
      setTestOutput(`Error invoking Python backend test: ${err.message}`);
    } finally {
      setIsRunningTest(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'terminal' && !testOutput) {
      runPythonTest();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pythonCodeSnippet = `# PlanWise AI - Core AI Scheduling Engine (Python)
# Priority Formula: (Difficulty * 10) / Days_Remaining_Until_Exam

def calculate_priority(difficulty: float, exam_date_str: str, current_date: datetime.date) -> float:
    exam_date = datetime.datetime.strptime(exam_date_str, "%Y-%m-%d").date()
    days_remaining = max(1, (exam_date - current_date).days)
    return round((float(difficulty) * 10.0) / float(days_remaining), 2)

def generate_weekly_schedule(user, subjects, start_date=None):
    # 15% buffer of free time reserved
    effective_study_hours = user["studyHoursPerDay"] * 0.85
    buffer_hours = user["studyHoursPerDay"] * 0.15
    peak_energy_time = user.get("peakEnergyTime", "Morning")

    # High difficulty (>= 7) placed into peak energy window:
    # Morning (08:00-12:00), Afternoon (13:00-17:00), Night (19:00-23:00)
    # Generates 1-hour to 2-hour blocks for the upcoming 7 days
    ...

def adjust_missed_schedule(existing_tasks, missed_task_id, user):
    # Redistributes missed hours into open buffer blocks of the week
    # without overlapping existing tasks!
    ...`;

  const firestoreSchemaSnippet = `{
  "entities": {
    "User": {
      "properties": {
        "uid": { "type": "string" },
        "email": { "type": "string" },
        "studyHoursPerDay": { "type": "number" },
        "peakEnergyTime": { "type": "string", "enum": ["Morning", "Afternoon", "Night"] }
      },
      "required": ["uid", "email", "studyHoursPerDay", "peakEnergyTime"]
    },
    "Subject": {
      "properties": {
        "id": { "type": "string" },
        "userId": { "type": "string" },
        "name": { "type": "string" },
        "examDate": { "type": "string", "format": "date" },
        "difficulty": { "type": "number", "minimum": 1, "maximum": 10 },
        "priorityScore": { "type": "number" }
      },
      "required": ["id", "userId", "name", "examDate", "difficulty"]
    },
    "Task": {
      "properties": {
        "id": { "type": "string" },
        "userId": { "type": "string" },
        "subjectId": { "type": "string" },
        "subjectName": { "type": "string" },
        "startTime": { "type": "string", "format": "date-time" },
        "endTime": { "type": "string", "format": "date-time" },
        "durationHours": { "type": "number" },
        "status": { "type": "string", "enum": ["scheduled", "completed", "missed"] }
      },
      "required": ["id", "userId", "subjectId", "subjectName", "startTime", "endTime", "durationHours", "status"]
    }
  },
  "firestore": {
    "/users/{userId}": { "schema": { "$ref": "#/entities/User" } },
    "/subjects/{subjectId}": { "schema": { "$ref": "#/entities/Subject" } },
    "/tasks/{taskId}": { "schema": { "$ref": "#/entities/Task" } }
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col shadow-2xl overflow-hidden font-mono">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-zinc-800 border border-zinc-700">
              <Code2 className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
                PlanWise AI - Architecture &amp; Code Inspector
              </h3>
              <p className="text-[11px] text-zinc-400">
                Step 2 (Firestore Blueprint) &amp; Step 3 (Python Scheduler Engine)
              </p>
            </div>
          </div>

          <button
            id="btn-close-engine-modal"
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-6 gap-2 text-xs">
          <button
            id="tab-engine-python"
            onClick={() => setActiveTab('python')}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'python'
                ? 'border-zinc-100 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>scheduler.py (Python 3.10)</span>
          </button>

          <button
            id="tab-engine-firestore"
            onClick={() => setActiveTab('firestore')}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'firestore'
                ? 'border-zinc-100 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>firebase-blueprint.json</span>
          </button>

          <button
            id="tab-engine-terminal"
            onClick={() => {
              setActiveTab('terminal');
              if (!testOutput) runPythonTest();
            }}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'terminal'
                ? 'border-zinc-100 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Python Terminal Test</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed bg-zinc-950">
          
          {activeTab === 'python' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-zinc-400 text-[11px] pb-2 border-b border-zinc-800">
                <span>Core Scheduling &amp; Dynamic Adjustment Algorithm</span>
                <button
                  onClick={() => copyToClipboard(pythonCodeSnippet)}
                  className="flex items-center gap-1 hover:text-zinc-100 text-zinc-400 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied' : 'Copy Python'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-200 overflow-x-auto text-[11px] leading-5">
                <code>{pythonCodeSnippet}</code>
              </pre>
              <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/30 text-[11px] text-zinc-400 space-y-1">
                <div>• Priority = <code>(Difficulty × 10) ÷ Days_Remaining_Until_Exam</code></div>
                <div>• Blocks: 1.0h to 2.0h duration</div>
                <div>• 15% free buffer mathematically reserved in daily time budget</div>
                <div>• High difficulty placed into user's designated Peak Energy Window</div>
                <div>• Endpoint <code>/adjust-schedule</code> redistributes missed hours into open buffer slots</div>
              </div>
            </div>
          )}

          {activeTab === 'firestore' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-zinc-400 text-[11px] pb-2 border-b border-zinc-800">
                <span>Firestore Database Schema (Exact JSON Representation)</span>
                <button
                  onClick={() => copyToClipboard(firestoreSchemaSnippet)}
                  className="flex items-center gap-1 hover:text-zinc-100 text-zinc-400 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied' : 'Copy Schema'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-200 overflow-x-auto text-[11px] leading-5">
                <code>{firestoreSchemaSnippet}</code>
              </pre>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-zinc-400 text-[11px] pb-2 border-b border-zinc-800">
                <span>Live Container Execution: <code className="text-zinc-200">python3 scheduler.py --action test</code></span>
                <button
                  onClick={runPythonTest}
                  disabled={isRunningTest}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 text-zinc-950 font-bold hover:bg-white transition-colors disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  <span>{isRunningTest ? 'Running...' : 'Rerun Python Engine Test'}</span>
                </button>
              </div>
              <div className="p-4 rounded-lg bg-black border border-zinc-800 font-mono text-[11px] text-zinc-200 whitespace-pre-wrap leading-5 min-h-[220px]">
                {isRunningTest ? (
                  <span className="text-zinc-400 animate-pulse">Spawning python3 scheduler.py process in container...</span>
                ) : (
                  testOutput || 'Click "Rerun Python Engine Test" to execute.'
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-between items-center text-xs">
          <span className="text-zinc-400 text-[11px]">
            PlanWise AI • Antigravity Paradigm
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
