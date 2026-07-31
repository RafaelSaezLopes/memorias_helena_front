import { useEffect, useState } from 'react';
import { Avatar, Button, Dropdown, Layout, Menu, Space, Typography, Grid } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  CloseOutlined,
  DashboardFilled,
  FolderOpenOutlined,
  FileTextOutlined,
  HeartOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const screens = Grid.useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const mobile = screens.md === false;

  useEffect(() => {
    if (mobile) {
      setCollapsed(true);
    }
  }, [mobile]);

  useEffect(() => {
    if (mobile) {
      setCollapsed(true);
    }
  }, [location.pathname, mobile]);

  const can = (module: string) => user?.role === 'ADMIN' || user?.permissions?.includes(module);

  const healthChildren = [
    can('professionals') && { key: '/saude/profissionais', icon: <TeamOutlined />, label: 'Profissionais' },
    can('exams') && { key: '/saude/exames', icon: <FolderOpenOutlined />, label: 'Exames' },
    can('medications') && { key: '/saude/medicamentos', icon: <MedicineBoxOutlined />, label: 'Medicamentos' },
    can('voiding_diary') && { key: '/saude/diario-miccional', icon: <DashboardFilled />, label: 'Diário miccional' },
  ].filter(Boolean) as any[];

  const items = [
    can('dashboard') && { key: '/', icon: <DashboardOutlined />, label: 'Início' },
    can('personal_data') && { key: '/dados-pessoais', icon: <IdcardOutlined />, label: 'Dados pessoais' },
    can('documents') && { key: '/documentos', icon: <FileTextOutlined />, label: 'Documentos' },
    can('photos') && { key: '/fotos', icon: <PictureOutlined />, label: 'Fotos e momentos' },
    healthChildren.length > 0 && { key: 'saude', icon: <HeartOutlined />, label: 'Saúde', children: healthChildren },
    can('daily_notes') && { key: '/diario', icon: <BookOutlined />, label: 'Diário e anotações' },
    { key: '/configuracoes', icon: <SettingOutlined />, label: 'Configurações' },
  ].filter(Boolean) as any[];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (mobile) {
      setCollapsed(true);
    }
  };

  const menuOpen = mobile && !collapsed;

  return (
    <Layout className={`app-shell ${menuOpen ? 'mobile-menu-open' : ''}`}>
      {menuOpen && (
        <button
          type="button"
          className="mobile-menu-backdrop"
          aria-label="Fechar menu"
          onClick={() => setCollapsed(true)}
        />
      )}

      <Sider
        width={260}
        collapsedWidth={mobile ? 0 : 80}
        collapsed={collapsed}
        className={`sidebar ${mobile ? 'sidebar-mobile' : ''}`}
        trigger={null}
      >
        <div className="brand">
          <div className="brand-mark">H</div>
          {!collapsed && (
            <div>
              <strong>Memórias</strong>
              <span>da Helena</span>
            </div>
          )}
          {mobile && !collapsed && (
            <Button
              type="text"
              className="mobile-menu-close"
              icon={<CloseOutlined />}
              aria-label="Fechar menu"
              onClick={() => setCollapsed(true)}
            />
          )}
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['saude']}
          items={items}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout className="app-main-layout">
        <Header className="topbar">
          <Button
            type="text"
            className="menu-toggle-button"
            aria-label={collapsed ? 'Abrir menu' : 'Fechar menu'}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((value) => !value)}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: 'Meu perfil' },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Sair', danger: true },
              ],
              onClick: ({ key }) => key === 'logout' && signOut(),
            }}
          >
            <Space className="user-menu">
              <Avatar icon={<UserOutlined />} />
              {!mobile && (
                <div>
                  <Typography.Text strong>{user?.name}</Typography.Text>
                  <small>{user?.role === 'ADMIN' ? 'Administrador' : 'Familiar'}</small>
                </div>
              )}
            </Space>
          </Dropdown>
        </Header>
        <Content className="page-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
