'use client';

import React from 'react';
import { MapPin, Building2, ExternalLink, Code } from 'lucide-react';
import type { JobItem } from '@/lib/tools/search-jobs';

interface JobCardProps {
  job: JobItem & { score?: number };
  onClick?: () => void;
}

export default function JobCard({ job, onClick }: JobCardProps) {
  const seniorityLabel = {
    junior: 'ジュニア',
    mid: 'ミドル',
    senior: 'シニア',
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {job.title}
          </h3>
          <div className="flex items-center text-sm text-gray-600 space-x-4">
            <span className="flex items-center">
              <Building2 className="w-4 h-4 mr-1" />
              {job.company}
            </span>
            <span className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {job.location}
            </span>
          </div>
        </div>
        <ExternalLink className="w-5 h-5 text-blue-500 flex-shrink-0" />
      </div>

      {job.description && (
        <p className="text-sm text-gray-700 mb-3">{job.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-2">
        {job.skills?.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            <Code className="w-3 h-3 mr-1" />
            {skill}
          </span>
        ))}
        {job.seniority && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {seniorityLabel[job.seniority]}
          </span>
        )}
      </div>

      {job.score !== undefined && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">マッチ度</span>
            <div className="flex items-center">
              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(job.score, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700">
                {job.score}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}