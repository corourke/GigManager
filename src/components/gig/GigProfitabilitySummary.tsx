import React from 'react';
import { cn } from '../ui/utils';

interface GigProfitabilitySummaryProps {
  summary: {
    contractAmount: number;
    received: number;
    outstandingRevenue: number;
    actualCosts: number;
    projectedStaffCosts: number;
    totalCosts: number;
    profit: number;
    margin: number;
  };
  isLoading?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: '2px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: 1.2,
};

const detailStyle: React.CSSProperties = {
  fontSize: '12px',
  marginTop: '3px',
};

const dividerStyle: React.CSSProperties = {
  width: '1px',
  alignSelf: 'stretch',
  flexShrink: 0,
  margin: '0 16px',
};

const GigProfitabilitySummary: React.FC<GigProfitabilitySummaryProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse" style={{ paddingRight: 16, marginRight: i < 3 ? 16 : 0, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div className="bg-muted rounded" style={{ height: 10, width: 40, marginBottom: 6 }} />
            <div className="bg-muted rounded" style={{ height: 14, width: 64, marginBottom: 4 }} />
            <div className="bg-muted rounded" style={{ height: 10, width: 96, opacity: 0.6 }} />
          </div>
        ))}
      </div>
    );
  }

  const {
    contractAmount,
    received,
    outstandingRevenue,
    actualCosts,
    projectedStaffCosts,
    totalCosts,
    profit,
    margin,
  } = summary;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ paddingRight: 16 }}>
        <p className="text-muted-foreground" style={labelStyle}>Revenue</p>
        <p style={valueStyle}>{formatCurrency(contractAmount)}</p>
        <p className="text-muted-foreground" style={detailStyle}>
          Rcvd <span className="font-medium">{formatCurrency(received)}</span>
          {' · '}
          Due <span className={cn("font-medium", outstandingRevenue > 0 ? "text-amber-600" : "text-green-600")}>{formatCurrency(outstandingRevenue)}</span>
        </p>
      </div>

      <div className="bg-border" style={dividerStyle} />

      <div style={{ paddingRight: 16 }}>
        <p className="text-muted-foreground" style={labelStyle}>Costs</p>
        <p style={valueStyle}>{formatCurrency(totalCosts)}</p>
        <p className="text-muted-foreground" style={detailStyle}>
          Actual <span className="font-medium">{formatCurrency(actualCosts)}</span>
          {' · '}
          Staff <span className="font-medium">{formatCurrency(projectedStaffCosts)}</span>
        </p>
      </div>

      <div className="bg-border" style={dividerStyle} />

      <div>
        <p className="text-muted-foreground" style={labelStyle}>
          {profit >= 0 ? 'Profit' : 'Loss'}
        </p>
        <p className={cn(profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "")} style={valueStyle}>
          {formatCurrency(profit)}
        </p>
        <p className="text-muted-foreground" style={detailStyle}>
          Margin <span className={cn("font-medium", profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "")}>{margin.toFixed(1)}%</span>
        </p>
      </div>
    </div>
  );
};

export default GigProfitabilitySummary;
