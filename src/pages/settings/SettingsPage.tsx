import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Divider, Form, Input, Modal, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import * as service from '../../services/settingsService';
import type { ManagedUser, Permission } from '../../services/settingsService';

const MODULES = [
  ['dashboard', 'Início'], ['personal_data', 'Dados pessoais'], ['photos', 'Fotos e momentos'],
  ['professionals', 'Profissionais'], ['exams', 'Exames'], ['medications', 'Medicamentos'],
  ['voiding_diary', 'Diário miccional'], ['daily_notes', 'Diário e anotações'], ['documents', 'Documentos'],
] as const;

function permissionsFor(user?: ManagedUser): Permission[] {
  return MODULES.map(([module]) => user?.permissions.find((p) => p.module === module) ?? { module, canView: false, canEdit: false });
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<service.MeSettings>();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [userModal, setUserModal] = useState(false);
  const [editing, setEditing] = useState<ManagedUser>();
  const [accountForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [userForm] = Form.useForm();
  const isAdmin = user?.role === 'ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const data = await service.getMe(); setMe(data); updateUser({ id: data.id, name: data.name, email: data.email, role: data.role, permissions: data.permissions.filter((p) => p.canView).map((p) => p.module) });
      accountForm.setFieldsValue({ name: data.name, email: data.email });
      notificationForm.setFieldsValue(data.notification);
      if (data.role === 'ADMIN') setUsers(await service.listUsers());
    } catch (e: any) { message.error(e?.response?.data?.message ?? 'Não foi possível carregar as configurações.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const saveAccount = async (values: { name: string; email: string }) => {
    const updated = await service.updateAccount(values);
    updateUser({ ...(user!), name: updated.name, email: updated.email, role: updated.role });
    message.success('Dados da conta atualizados.'); await load();
  };
  const savePassword = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    await service.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
    passwordForm.resetFields(); message.success('Senha alterada com sucesso.');
  };
  const saveNotifications = async (values: any) => {
    if ((values.appointmentEnabled || values.medicationEnabled) && !values.notificationEmail) {
      notificationForm.setFields([{ name: 'notificationEmail', errors: ['Informe o e-mail que receberá os avisos.'] }]); return;
    }
    await service.updateNotifications(values); message.success('Preferências de notificação salvas.');
  };

  const openUser = (record?: ManagedUser) => {
    setEditing(record); setUserModal(true);
    userForm.setFieldsValue(record ? { ...record, permissions: permissionsFor(record) } : { role: 'FAMILY', active: true, permissions: permissionsFor() });
  };
  const saveUser = async (values: any) => {
    const payload = { ...values, permissions: values.role === 'ADMIN' ? [] : values.permissions };
    if (editing) await service.updateUser(editing.id, payload); else await service.createUser(payload);
    message.success(editing ? 'Usuário atualizado.' : 'Login criado.'); setUserModal(false); userForm.resetFields(); setUsers(await service.listUsers());
  };

  const accountTab = <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card loading={loading} title={<Space><UserOutlined/>Conta</Space>}>
      <Form form={accountForm} layout="vertical" style={{ maxWidth: 560 }} onFinish={saveAccount}>
        <Form.Item name="name" label="Nome de exibição" rules={[{ required: true }]}><Input/></Form.Item>
        <Form.Item name="email" label="E-mail de login" rules={[{ required: true, type: 'email' }]}><Input/></Form.Item>
        <Button type="primary" htmlType="submit">Salvar dados da conta</Button>
      </Form>
    </Card>
    <Card title={<Space><LockOutlined/>Alterar senha</Space>}>
      <Form form={passwordForm} layout="vertical" style={{ maxWidth: 560 }} onFinish={savePassword}>
        <Form.Item name="currentPassword" label="Senha atual" rules={[{ required: true }]}><Input.Password/></Form.Item>
        <Form.Item name="newPassword" label="Nova senha" rules={[{ required: true, min: 6 }]}><Input.Password/></Form.Item>
        <Form.Item name="confirmPassword" label="Confirmar nova senha" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error('As senhas não coincidem.')); } })]}><Input.Password/></Form.Item>
        <Button type="primary" htmlType="submit">Alterar senha</Button>
      </Form>
    </Card>
  </Space>;

  const notificationsTab = <Card loading={loading} title={<Space><MailOutlined/>Avisos por e-mail</Space>}>
    <Alert style={{ marginBottom: 20 }} type="info" showIcon message="Consultas: aviso 1 dia antes. Medicamentos: aviso 5 minutos antes do horário inicial registrado." description="Para medicamentos, o sistema usa o campo Horário em que começou como horário diário do aviso."/>
    <Form form={notificationForm} layout="vertical" style={{ maxWidth: 620 }} onFinish={saveNotifications}>
      <Form.Item name="appointmentEnabled" label="Lembrar de consultas" valuePropName="checked"><Switch/></Form.Item>
      <Form.Item name="medicationEnabled" label="Avisar sobre medicamentos" valuePropName="checked"><Switch/></Form.Item>
      <Form.Item noStyle shouldUpdate={(a,b) => a.appointmentEnabled !== b.appointmentEnabled || a.medicationEnabled !== b.medicationEnabled}>
        {({ getFieldValue }) => (getFieldValue('appointmentEnabled') || getFieldValue('medicationEnabled')) ? <Form.Item name="notificationEmail" label="E-mail para receber os avisos" rules={[{ required: true, type: 'email' }]}><Input prefix={<MailOutlined/>} placeholder="exemplo@email.com"/></Form.Item> : null}
      </Form.Item>
      <Button type="primary" htmlType="submit">Salvar notificações</Button>
    </Form>
  </Card>;

  const adminTab = <Card title={<Space><TeamOutlined/>Logins e permissões</Space>} extra={<Button type="primary" onClick={() => openUser()}>Criar login</Button>}>
    <Alert type="warning" showIcon style={{ marginBottom: 18 }} message="Esta área é exclusiva para administradores." description="Familiares só enxergam e alteram os módulos liberados aqui. A proteção também é aplicada na API."/>
    <Table rowKey="id" dataSource={users} pagination={false} columns={[
      { title: 'Nome', dataIndex: 'name' }, { title: 'E-mail', dataIndex: 'email' },
      { title: 'Perfil', dataIndex: 'role', render: (v) => <Tag color={v === 'ADMIN' ? 'purple' : 'blue'}>{v === 'ADMIN' ? 'Administrador' : 'Familiar'}</Tag> },
      { title: 'Situação', dataIndex: 'active', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Ativo' : 'Inativo'}</Tag> },
      { title: 'Ações', render: (_, r) => <Button onClick={() => openUser(r)}>Editar permissões</Button> },
    ]}/>
  </Card>;

  const tabs = useMemo(() => [
    { key: 'account', label: 'Conta e senha', children: accountTab },
    { key: 'notifications', label: 'Notificações', children: notificationsTab },
    ...(isAdmin ? [{ key: 'admin', label: 'Usuários e permissões', children: adminTab }] : []),
  ], [loading, me, users, isAdmin]);

  return <>
    <PageHeader title="Configurações" subtitle="Conta, segurança, notificações e controle de acesso."/>
    <Tabs items={tabs}/>
    <Modal title={editing ? 'Editar usuário e permissões' : 'Criar novo login'} open={userModal} onCancel={() => setUserModal(false)} onOk={() => userForm.submit()} width={760} okText="Salvar">
      <Form form={userForm} layout="vertical" onFinish={saveUser}>
        <Space align="start" wrap style={{ width: '100%' }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input style={{ width: 260 }}/></Form.Item>
          <Form.Item name="email" label="E-mail de login" rules={[{ required: true, type: 'email' }]}><Input style={{ width: 300 }}/></Form.Item>
        </Space>
        {!editing && <Form.Item name="password" label="Senha inicial" rules={[{ required: true, min: 6 }]}><Input.Password style={{ maxWidth: 300 }}/></Form.Item>}
        <Space align="start">
          <Form.Item name="role" label="Perfil" rules={[{ required: true }]}><Select style={{ width: 220 }} options={[{ value: 'ADMIN', label: 'Administrador' }, { value: 'FAMILY', label: 'Familiar' }]}/></Form.Item>
          {editing && <Form.Item name="active" label="Login ativo" valuePropName="checked"><Switch/></Form.Item>}
        </Space>
        <Form.Item noStyle shouldUpdate={(a,b) => a.role !== b.role}>
          {({ getFieldValue }) => getFieldValue('role') === 'FAMILY' ? <>
            <Divider><SafetyCertificateOutlined/> Permissões do familiar</Divider>
            <Typography.Paragraph type="secondary">Visualizar permite abrir a área. Editar permite cadastrar, alterar e excluir.</Typography.Paragraph>
            <Form.List name="permissions">{(fields) => <Space direction="vertical" style={{ width: '100%' }}>{fields.map((field, index) => <Card size="small" key={field.key}>
              <Form.Item name={[field.name, 'module']} hidden><Input/></Form.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <strong>{MODULES[index]?.[1]}</strong>
                <Space><Form.Item name={[field.name, 'canView']} valuePropName="checked" noStyle><Checkbox>Visualizar</Checkbox></Form.Item><Form.Item name={[field.name, 'canEdit']} valuePropName="checked" noStyle><Checkbox>Editar</Checkbox></Form.Item></Space>
              </Space>
            </Card>)}</Space>}</Form.List>
          </> : <Alert type="success" showIcon message="Administradores possuem acesso completo ao sistema."/>}
        </Form.Item>
      </Form>
    </Modal>
  </>;
}
