import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  professionalsService,
  type ProfessionalApi,
  type ProfessionalInput,
  type SpecialtyApi,
} from '../../services/professionalsService';

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function whatsappUrl(value?: string | null) {
  if (!value) return null;
  let digits = value.replace(/\D/g, '');
  if (!digits) return null;

  // Para números brasileiros sem DDI, acrescenta 55.
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return `https://wa.me/${digits}`;
}

export default function ProfessionalsPage() {
  const { child } = useAuth();
  const [items, setItems] = useState<ProfessionalApi[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfessionalApi | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!child?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [professionals, specialtyItems] = await Promise.all([
        professionalsService.list(child.id),
        professionalsService.listSpecialties(),
      ]);
      setItems(professionals);
      setSpecialties(specialtyItems);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Não foi possível carregar os profissionais.');
    } finally {
      setLoading(false);
    }
  }, [child?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const specialtyOptions = useMemo(
    () => specialties.map((item) => ({ label: item.name, value: item.id })),
    [specialties],
  );

  const start = (item?: ProfessionalApi) => {
    setEditing(item ?? null);
    form.resetFields();
    if (item) {
      form.setFieldsValue({
        name: item.name,
        specialtyId: item.specialtyId,
        councilType: item.councilType ?? 'CRM',
        councilNumber: item.councilNumber,
        phone: item.phone,
        whatsApp: item.whatsApp,
        email: item.email,
        institution: item.institution,
        address: item.address,
        notes: item.notes,
      });
    } else {
      form.setFieldsValue({ councilType: 'CRM' });
    }
    setOpen(true);
  };

  const save = async () => {
    if (!child?.id) return;
    const values = await form.validateFields();
    const input: ProfessionalInput = {
      childId: child.id,
      specialtyId: values.specialtyId,
      name: values.name.trim(),
      councilType: cleanText(values.councilType),
      councilNumber: cleanText(values.councilNumber),
      phone: cleanText(values.phone),
      whatsApp: cleanText(values.whatsApp),
      email: cleanText(values.email),
      institution: cleanText(values.institution),
      address: cleanText(values.address),
      notes: cleanText(values.notes),
    };

    setSaving(true);
    try {
      if (editing) {
        await professionalsService.update(editing.id, input);
        message.success('Profissional atualizado no banco de dados.');
      } else {
        await professionalsService.create(input);
        message.success('Profissional cadastrado no banco de dados.');
      }
      setOpen(false);
      form.resetFields();
      await load();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível salvar o profissional.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await professionalsService.remove(id);
      message.success('Profissional excluído.');
      await load();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível excluir o profissional.');
    }
  };

  return (
    <>
      <PageHeader
        title="Profissionais de saúde"
        subtitle="Médicos e especialistas que acompanham a Helena."
        action={() => start()}
        actionLabel="Adicionar profissional"
      />

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button onClick={() => void load()}>Tentar novamente</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          locale={{ emptyText: 'Nenhum profissional cadastrado.' }}
          columns={[
            { title: 'Nome', dataIndex: 'name' },
            {
              title: 'Especialidade',
              render: (_, record) => <Tag color="purple">{record.specialty?.name ?? 'Não informada'}</Tag>,
            },
            {
              title: 'Conselho',
              render: (_, record) =>
                [record.councilType, record.councilNumber].filter(Boolean).join(' ') || '—',
            },
            {
              title: 'Telefone',
              render: (_, record) => {
                const number = record.whatsApp || record.phone;
                const url = whatsappUrl(number);
                return (
                  <Space size={6}>
                    <span>{record.phone || record.whatsApp || '—'}</span>
                    {url && (
                      <Tooltip title="Abrir conversa no WhatsApp">
                        <Button
                          type="text"
                          aria-label="Abrir WhatsApp"
                          icon={<WhatsAppOutlined style={{ fontSize: 20 }} />}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        />
                      </Tooltip>
                    )}
                  </Space>
                );
              },
            },
            { title: 'Clínica', dataIndex: 'institution', render: (value) => value || '—' },
            {
              title: 'Ações',
              width: 130,
              render: (_, record) => (
                <Space>
                  <Tooltip title="Editar">
                    <Button icon={<EditOutlined />} onClick={() => start(record)} />
                  </Tooltip>
                  <Popconfirm
                    title="Excluir profissional?"
                    description="Essa ação não poderá ser desfeita."
                    okText="Excluir"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void remove(record.id)}
                  >
                    <Tooltip title="Excluir">
                      <Button danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          scroll={{ x: 950 }}
        />
      </Card>

      <Modal
        title={editing ? 'Editar profissional' : 'Novo profissional'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        okText="Salvar"
        cancelText="Cancelar"
        confirmLoading={saving}
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Nome"
            name="name"
            rules={[{ required: true, message: 'Informe o nome do profissional.' }]}
          >
            <Input placeholder="Ex.: Dra. Mariana Silva" />
          </Form.Item>

          <Form.Item
            label="Especialidade"
            name="specialtyId"
            rules={[{ required: true, message: 'Selecione a especialidade.' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={specialtyOptions}
              placeholder="Selecione uma especialidade"
              notFoundContent="Nenhuma especialidade disponível"
            />
          </Form.Item>

          <Space align="start" style={{ width: '100%' }} size="middle">
            <Form.Item label="Conselho" name="councilType" style={{ width: 170 }}>
              <Select
                options={[
                  { value: 'CRM', label: 'CRM' },
                  { value: 'CRO', label: 'CRO' },
                  { value: 'CRP', label: 'CRP' },
                  { value: 'CREFITO', label: 'CREFITO' },
                  { value: 'COREN', label: 'COREN' },
                  { value: 'Outro', label: 'Outro' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Número do conselho" name="councilNumber" style={{ flex: 1, minWidth: 260 }}>
              <Input placeholder="Ex.: SP 123456" />
            </Form.Item>
          </Space>

          <Space align="start" style={{ width: '100%' }} size="middle">
            <Form.Item label="Telefone" name="phone" style={{ flex: 1, minWidth: 280 }}>
              <Input placeholder="(11) 99999-1111" />
            </Form.Item>
            <Form.Item
              label="WhatsApp"
              name="whatsApp"
              style={{ flex: 1, minWidth: 280 }}
              extra="Pode ser igual ao telefone."
            >
              <Input prefix={<WhatsAppOutlined />} placeholder="(11) 99999-1111" />
            </Form.Item>
          </Space>

          <Form.Item
            label="E-mail"
            name="email"
            rules={[{ type: 'email', message: 'Informe um e-mail válido.' }]}
          >
            <Input placeholder="medico@clinica.com.br" />
          </Form.Item>

          <Form.Item label="Clínica ou hospital" name="institution">
            <Input placeholder="Nome da clínica ou hospital" />
          </Form.Item>

          <Form.Item label="Endereço" name="address">
            <Input placeholder="Endereço do atendimento" />
          </Form.Item>

          <Form.Item label="Observações" name="notes">
            <Input.TextArea rows={3} placeholder="Informações adicionais sobre o profissional" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
