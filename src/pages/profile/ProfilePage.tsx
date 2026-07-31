import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, DatePicker, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Skeleton, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getChild, updateChild } from '../../services/childrenService';
import { createVaccine, deleteVaccine, listVaccines, updateVaccine, type Vaccine } from '../../services/vaccinesService';
import type { ChildProfile } from '../../types';

export default function ProfilePage() {
  const { child, updateChildSummary } = useAuth();
  const [profile, setProfile] = useState<ChildProfile | null>(null); const [vaccines,setVaccines]=useState<Vaccine[]>([]);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState<string>();
  const [open,setOpen]=useState(false); const [vaccineOpen,setVaccineOpen]=useState(false); const [editingVaccine,setEditingVaccine]=useState<Vaccine|null>(null);
  const [form]=Form.useForm(); const [vaccineForm]=Form.useForm();

  const load=async()=>{if(!child?.id)return;setLoading(true);setError(undefined);try{const [p,v]=await Promise.all([getChild(child.id),listVaccines(child.id)]);setProfile(p);setVaccines(v);}catch(e){setError(e instanceof Error?e.message:'Erro ao carregar dados.')}finally{setLoading(false)}};
  useEffect(()=>{void load()},[child?.id]);
  const edit=()=>{if(!profile)return;form.setFieldsValue({...profile,birthDate:dayjs(profile.birthDate),allergies:profile.allergies?.join(', ')});setOpen(true)};
  const save=async()=>{if(!profile)return;const v=await form.validateFields();setSaving(true);try{const u=await updateChild(profile.id,{fullName:v.fullName,birthDate:v.birthDate.format('YYYY-MM-DD'),cpf:v.cpf||null,birthCertificate:v.birthCertificate||null,bloodType:v.bloodType||null,nationality:v.nationality||null,birthPlace:v.birthPlace||null,address:v.address||null,school:v.school||null,healthPlan:v.healthPlan||null,healthPlanNumber:v.healthPlanNumber||null,allergies:v.allergies||null,notes:v.notes||null});setProfile(u);updateChildSummary({id:u.id,fullName:u.fullName,birthDate:u.birthDate});setOpen(false);message.success('Dados salvos no banco')}catch(e){message.error(e instanceof Error?e.message:'Erro ao salvar')}finally{setSaving(false)}};
  const openVaccine=(v?:Vaccine)=>{setEditingVaccine(v||null);vaccineForm.setFieldsValue(v?{...v,appliedAt:dayjs(v.appliedAt),nextDoseAt:v.nextDoseAt?dayjs(v.nextDoseAt):undefined}:{appliedAt:dayjs()});setVaccineOpen(true)};
  const saveVaccine=async()=>{if(!child?.id)return;const v=await vaccineForm.validateFields();const payload={childId:child.id,name:v.name,dose:v.dose||null,appliedAt:v.appliedAt.format('YYYY-MM-DD'),nextDoseAt:v.nextDoseAt?.format('YYYY-MM-DD')||null,institution:v.institution||null,batch:v.batch||null,notes:v.notes||null};setSaving(true);try{editingVaccine?await updateVaccine(editingVaccine.id,payload):await createVaccine(payload);message.success('Vacina salva');setVaccineOpen(false);await load()}catch(e){message.error(e instanceof Error?e.message:'Erro ao salvar vacina')}finally{setSaving(false)}};

  return <>
    <PageHeader title="Dados pessoais" subtitle="Informações principais da Helena." />
    {error&&<Alert type="error" showIcon message={error} action={<Button onClick={()=>void load()}>Tentar novamente</Button>} style={{marginBottom:16}}/>}
    <Card extra={<Button icon={<EditOutlined/>} onClick={edit} disabled={!profile}>Editar</Button>}>
      {loading||!profile?<Skeleton active/>:<Descriptions bordered column={{xs:1,sm:1,md:2,lg:2}}>
        <Descriptions.Item label="Nome completo">{profile.fullName}</Descriptions.Item><Descriptions.Item label="Data de nascimento">{dayjs(profile.birthDate).format('DD/MM/YYYY')}</Descriptions.Item>
        <Descriptions.Item label="Tipo sanguíneo">{profile.bloodType||'Não informado'}</Descriptions.Item><Descriptions.Item label="CPF">{profile.cpf||'Não informado'}</Descriptions.Item>
        <Descriptions.Item label="Certidão de nascimento">{profile.birthCertificate||'Não informada'}</Descriptions.Item><Descriptions.Item label="Escola">{profile.school||'Não informada'}</Descriptions.Item>
        <Descriptions.Item label="Plano de saúde">{profile.healthPlan||'Não informado'}</Descriptions.Item><Descriptions.Item label="Carteirinha">{profile.healthPlanNumber||'Não informada'}</Descriptions.Item>
        <Descriptions.Item label="Nacionalidade">{profile.nationality||'Não informada'}</Descriptions.Item><Descriptions.Item label="Naturalidade">{profile.birthPlace||'Não informada'}</Descriptions.Item>
        <Descriptions.Item label="Endereço" span={2}>{profile.address||'Não informado'}</Descriptions.Item><Descriptions.Item label="Alergias" span={2}>{profile.allergies?.length?profile.allergies.join(', '):'Nenhuma alergia registrada'}</Descriptions.Item><Descriptions.Item label="Observações" span={2}>{profile.notes||'Nenhuma observação'}</Descriptions.Item>
      </Descriptions>}
    </Card>

    <Card title="Vacinas" style={{marginTop:20}} extra={<Button type="primary" icon={<PlusOutlined/>} onClick={()=>openVaccine()}>Nova vacina</Button>}>
      <Table rowKey="id" dataSource={vaccines} loading={loading} pagination={{pageSize:8}} columns={[
        {title:'Vacina',dataIndex:'name'}, {title:'Dose',dataIndex:'dose',render:(v)=>v||'-'},
        {title:'Aplicada em',dataIndex:'appliedAt',render:(v)=>dayjs(v).format('DD/MM/YYYY')},
        {title:'Próxima dose',dataIndex:'nextDoseAt',render:(v)=>v?<Tag color="blue">{dayjs(v).format('DD/MM/YYYY')}</Tag>:'-'},
        {title:'Local',dataIndex:'institution',render:(v)=>v||'-'}, {title:'Lote',dataIndex:'batch',render:(v)=>v||'-'},
        {title:'Ações',render:(_,r)=><Space><Button icon={<EditOutlined/>} onClick={()=>openVaccine(r)}/><Popconfirm title="Excluir vacina?" onConfirm={async()=>{await deleteVaccine(r.id);message.success('Vacina excluída');await load()}}><Button danger icon={<DeleteOutlined/>}/></Popconfirm></Space>}
      ]}/>
    </Card>

    <Modal title="Editar dados pessoais" open={open} onCancel={()=>setOpen(false)} onOk={()=>void save()} okText="Salvar no banco" confirmLoading={saving} width={820} destroyOnHidden><Form form={form} layout="vertical"><Row gutter={16}>
      <Col xs={24} md={12}><Form.Item label="Nome completo" name="fullName" rules={[{required:true}]}><Input/></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Data de nascimento" name="birthDate" rules={[{required:true}]}><DatePicker format="DD/MM/YYYY" style={{width:'100%'}}/></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item label="Tipo sanguíneo" name="bloodType"><Select allowClear options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(value=>({value,label:value}))}/></Form.Item></Col><Col xs={24} md={12}><Form.Item label="CPF" name="cpf"><Input/></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item label="Certidão de nascimento" name="birthCertificate"><Input/></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Escola" name="school"><Input/></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item label="Plano de saúde" name="healthPlan"><Input/></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Carteirinha" name="healthPlanNumber"><Input/></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item label="Nacionalidade" name="nationality"><Input/></Form.Item></Col><Col xs={24} md={12}><Form.Item label="Naturalidade" name="birthPlace"><Input/></Form.Item></Col>
      <Col span={24}><Form.Item label="Endereço" name="address"><Input/></Form.Item></Col><Col span={24}><Form.Item label="Alergias" name="allergies"><Input placeholder="Separe por vírgulas"/></Form.Item></Col><Col span={24}><Form.Item label="Observações" name="notes"><Input.TextArea rows={4}/></Form.Item></Col>
    </Row></Form></Modal>

    <Modal title={editingVaccine?'Editar vacina':'Nova vacina'} open={vaccineOpen} onCancel={()=>setVaccineOpen(false)} onOk={()=>void saveVaccine()} confirmLoading={saving} okText="Salvar"><Form form={vaccineForm} layout="vertical">
      <Form.Item label="Nome da vacina" name="name" rules={[{required:true,message:'Informe a vacina'}]}><Input/></Form.Item><Row gutter={16}><Col span={12}><Form.Item label="Dose" name="dose"><Input placeholder="1ª dose, reforço..."/></Form.Item></Col><Col span={12}><Form.Item label="Lote" name="batch"><Input/></Form.Item></Col></Row>
      <Row gutter={16}><Col span={12}><Form.Item label="Data de aplicação" name="appliedAt" rules={[{required:true}]}><DatePicker format="DD/MM/YYYY" style={{width:'100%'}}/></Form.Item></Col><Col span={12}><Form.Item label="Próxima dose" name="nextDoseAt"><DatePicker format="DD/MM/YYYY" style={{width:'100%'}}/></Form.Item></Col></Row>
      <Form.Item label="Local de aplicação" name="institution"><Input/></Form.Item><Form.Item label="Observações" name="notes"><Input.TextArea rows={3}/></Form.Item>
    </Form></Modal>
  </>;
}
