import { Button, Space, Typography } from 'antd';
import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action, actionLabel = 'Adicionar', extra }: { title: string; subtitle?: string; action?: () => void; actionLabel?: string; extra?: ReactNode }) {
  return (
    <div className="page-header">
      <div><Typography.Title level={2}>{title}</Typography.Title>{subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}</div>
      {extra ?? (action && <Space><Button type="primary" onClick={action}>{actionLabel}</Button></Space>)}
    </div>
  );
}
