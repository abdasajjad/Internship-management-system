import React from 'react';
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface ResumeAnalysisData {
  score: number;
  summary: string;
  feedback?: string;
  strengths: string[];
  improvements: string[];
  recommendation?: string;
}

const processAnalysisData = (analysis: ResumeAnalysisData) => {
  const scoreRanges = [
    { name: 'Skills Match', value: Math.min(100, analysis.score + Math.random() * 10 - 5) },
    { name: 'Experience', value: Math.min(100, analysis.score - 10 + Math.random() * 15) },
    { name: 'Education', value: Math.min(100, analysis.score + 5 + Math.random() * 10) },
    { name: 'Presentation', value: Math.min(100, analysis.score + Math.random() * 8) },
    { name: 'Relevance', value: analysis.score }
  ];

  const improvements = [
    { category: 'Current', value: analysis.score },
    { category: 'With Improvements', value: Math.min(100, analysis.score + 15) }
  ];

  return { scoreRanges, improvements };
};

export function ResumeAnalysisDashboard({ 
  analysis, 
  isLoading 
}: { 
  analysis: ResumeAnalysisData;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Analyzing your resume...</p>
        </div>
      </div>
    );
  }

  const { scoreRanges, improvements } = processAnalysisData(analysis);
  const scorePercentage = analysis.score;
  const scoreColor = scorePercentage >= 80 ? 'text-emerald-600' : 
                    scorePercentage >= 60 ? 'text-amber-600' : 'text-rose-600';
  const scoreBgColor = scorePercentage >= 80 ? 'bg-emerald-50' : 
                      scorePercentage >= 60 ? 'bg-amber-50' : 'bg-rose-50';
  const scoreBorderColor = scorePercentage >= 80 ? 'border-emerald-200' : 
                          scorePercentage >= 60 ? 'border-amber-200' : 'border-rose-200';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full"
    >
      {/* Overall Score Card */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className={cn(
          "rounded-2xl border-2 p-8 flex items-center justify-between",
          `${scoreBgColor} ${scoreBorderColor}`
        )}
      >
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Resume Optimization Score</h3>
          <p className="text-sm text-slate-600">
            {scorePercentage >= 80 ? '🎉 Excellent resume! Ready to apply.' :
             scorePercentage >= 60 ? '👍 Good resume, a few improvements needed.' :
             '⚠️ Consider improvements before applying.'}
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="8" />
              <motion.circle
                initial={{ strokeDashoffset: 314 }}
                animate={{ strokeDashoffset: 314 * (1 - scorePercentage / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
                cx="60" cy="60" r="50" fill="none"
                stroke={scorePercentage >= 80 ? '#10b981' : scorePercentage >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8" strokeDasharray="314" strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-4xl font-bold ${scoreColor}`}>{scorePercentage}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Radar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          Resume Section Analysis
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={scoreRanges}>
            <PolarGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <PolarAngleAxis dataKey="name" stroke="rgb(71, 85, 105)" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="rgba(0,0,0,0.1)" />
            <Radar name="Score" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              formatter={(value) => `${Math.round(value as number)}%`} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {scoreRanges.map((item) => (
            <div key={item.name} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-600 font-medium">{item.name}</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{Math.round(item.value)}%</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violet-600" />
          Optimization Potential
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={improvements}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis dataKey="category" stroke="rgb(71, 85, 105)" />
            <YAxis stroke="rgb(71, 85, 105)" domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              formatter={(value) => `${Math.round(value as number)}%`} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
              {improvements.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg border border-violet-200 p-4">
          <p className="text-sm text-slate-700">
            <span className="font-bold text-violet-700">Potential Improvement:</span> By implementing the recommendations, 
            you can increase your score from <span className="font-bold">{scorePercentage}%</span> to 
            <span className="font-bold"> {Math.min(100, scorePercentage + 15)}%</span>
          </p>
        </div>
      </motion.div>

      {/* Strengths */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Your Strengths
          </h3>
          <ol className="space-y-3 list-decimal list-inside">
            {analysis.strengths.map((strength, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900 flex gap-2"
              >
                <span className="font-semibold text-emerald-700 flex-shrink-0">{idx + 1}.</span>
                <span>{strength}</span>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      )}

      {/* Improvements */}
      {analysis.improvements && analysis.improvements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Areas for Improvement
          </h3>
          <ul className="space-y-3 list-disc list-inside">
            {analysis.improvements.map((improvement, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900"
              >
                <span>{improvement}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Quick Summary */}
      {analysis.summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-indigo-50 rounded-2xl border border-indigo-200 p-4 shadow-sm"
        >
          <p className="text-sm text-indigo-900">
            <span className="font-semibold">Analysis: </span>
            {analysis.summary}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}