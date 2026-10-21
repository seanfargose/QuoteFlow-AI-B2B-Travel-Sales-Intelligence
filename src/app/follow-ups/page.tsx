'use client';

import React, { useState } from 'react';
import { Header } from '../../components/Header';
import { useData } from '../../services/dataContext';
import { 
  PhoneCall, 
  Clock, 
  Check, 
  Copy, 
  ExternalLink, 
  Flame, 
  Sparkles,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

export const priorityBadgeStyles = {
  CRITICAL_CALL_NOW: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH_ATTENTION: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM_NUDGE: 'bg-blue-50 text-blue-700 border-blue-200',
  LOW_AUTOMATED: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function FollowUpsPage() {
  const { followUps, agents, quotes, completeFollowUp } = useData();
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  const pendingTasks = followUps.filter(f => f.status === 'PENDING');
  const completedTasks = followUps.filter(f => f.status === 'EXECUTED');

  return (
    <>
      <Header 
        title="Intent-Driven Follow-Up Queue" 
        subtitle="Behavioral action items generated from proposal opens, dwell time, and expiring validity"
      />

      <main className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Actions Due Today</span>
              <strong className="text-xl font-bold text-rose-600">{pendingTasks.length}</strong>
            </div>
            <Flame className="w-6 h-6 text-rose-500" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Completed Today</span>
              <strong className="text-xl font-bold text-emerald-600">{completedTasks.length}</strong>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Average Rep Response SLA</span>
              <strong className="text-xl font-bold text-slate-900">22 mins</strong>
            </div>
            <Clock className="w-6 h-6 text-indigo-500" />
          </div>
        </div>

        {/* Action Queue List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-subtle p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Active Follow-Up Action Queue
            </h2>
            <span className="text-xs text-slate-400">
              Ranked by Client Intent Score ($I_&#123;score&#125;$)
            </span>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              🎉 All follow-up tasks completed! High-converting reps check back hourly.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTasks.map((task) => {
                const agent = agents.find(a => a.id === task.agentId);
                const quote = quotes.find(q => q.id === task.quoteId);

                return (
                  <div
                    key={task.id}
                    className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-subtle space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityBadgeStyles[task.priority]}`}>
                            {task.priority.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {agent?.agencyName} ({agent?.city})
                          </span>
                          <span className="text-xs text-slate-400">• {agent?.phone}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          {task.suggestedActionTitle}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-slate-900 block">
                          Quote: {task.quoteId}
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mt-1 inline-block">
                          Intent: {quote?.intentScore || 85}/100
                        </span>
                      </div>
                    </div>

                    {/* Pre-written Contextual Copy */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-700 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-0.5">
                          Contextual WhatsApp Prompt:
                        </span>
                        &ldquo;{task.suggestedMessageCopy}&rdquo;
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(task.suggestedMessageCopy);
                          setCopiedTaskId(task.id);
                          setTimeout(() => setCopiedTaskId(null), 2000);
                        }}
                        className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold"
                      >
                        {copiedTaskId === task.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTaskId === task.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400">
                        Trigger: {task.triggerEvent.replace(/_/g, ' ')} • Scheduled: {new Date(task.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => completeFollowUp(task.id)}
                          className="px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          Mark Completed
                        </button>
                        <Link
                          href="/quotes"
                          className="px-3.5 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1"
                        >
                          <span>Open Quote</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
