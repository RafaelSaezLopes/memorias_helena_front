import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const submit = async (values: { email: string; password: string }) => {
    try {
      setLoading(true); setError('');
      await signIn(values.email, values.password);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="hero-badge">H</div>
        <Typography.Title>Agenda da Helena</Typography.Title>
        <Typography.Paragraph>Um espaço seguro para organizar momentos, saúde e informações importantes.</Typography.Paragraph>
      </div>
      <Card className="login-card">
        <Typography.Title level={3}>Bem-vindo</Typography.Title>
        <Typography.Text type="secondary">Entre com sua conta para continuar.</Typography.Text>
        {error && <Alert type="error" message={error} showIcon />}
        <Form layout="vertical" onFinish={submit} initialValues={{ email: '', password: '', remember: true }}>
          <Form.Item label="E-mail" name="email" rules={[{ required: true }, { type: 'email' }]}>
            <Input prefix={<MailOutlined />} size="large" placeholder="seu@email.com" />
          </Form.Item>
          <Form.Item label="Senha" name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} size="large" placeholder="Sua senha" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked"><Checkbox>Manter conectado</Checkbox></Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>Entrar</Button>
        </Form>
        
      </Card>
    </div>
  );
}
