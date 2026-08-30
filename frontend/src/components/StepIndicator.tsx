import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  number: number;
  label: string;
}

const STEPS: Step[] = [
  { number: 1, label: 'Grievance Details' },
  { number: 2, label: 'Location' },
  { number: 3, label: 'Evidence' },
  { number: 4, label: 'Review & Submit' },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps?: Set<number>;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onStepClick,
  completedSteps = new Set(),
}) => {
  return (
    <nav aria-label="Progress" className="w-full">
      {/* Desktop: horizontal */}
      <ol className="hidden sm:flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.has(step.number) && step.number < currentStep;
          const isCurrent = currentStep === step.number;
          const isFuture = !isCompleted && !isCurrent;
          const isClickable = isCompleted || step.number <= currentStep;
          const isLast = idx === STEPS.length - 1;

          return (
            <li key={step.number} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={`flex items-center gap-2.5 group ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Step circle */}
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-blue-100 border border-blue-200 text-blue-600'
                      : isCurrent
                      ? 'bg-blue-600 border border-blue-600 text-white'
                      : 'bg-white text-slate-400 border-2 border-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <span>{String(step.number).padStart(2, '0')}</span>
                  )}
                </span>

                {/* Step label */}
                <span
                  className={`text-sm ${
                    isCompleted
                      ? 'font-medium text-slate-700 group-hover:text-blue-600'
                      : isCurrent
                      ? 'font-semibold text-blue-600'
                      : 'font-normal text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓ ' : ''}{step.label}
                </span>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-4">
                  <div
                    className={`h-px w-full ${
                      isCompleted ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact */}
      <div className="sm:hidden flex flex-col gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-md">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
          <span>Step {currentStep} of {STEPS.length}</span>
          <span className="text-blue-600 font-bold">{STEPS[currentStep - 1].label}</span>
        </div>
        <div className="flex gap-1 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          {STEPS.map((step) => {
            const isCompletedOrCurrent = step.number <= currentStep;
            return (
              <div
                key={step.number}
                className={`flex-1 h-full transition-colors ${
                  isCompletedOrCurrent ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
};
