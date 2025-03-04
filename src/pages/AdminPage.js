import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import MDEditor from '@uiw/react-md-editor';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Article as ArticleIcon,
  Description as PageIcon,
  Collections as GalleryIcon
} from '@mui/icons-material';
import config from '../config';

const AdminPage = () => {
  const { octokit, user } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useLanguage();

  // 状态管理
  const [contents, setContents] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    template: 'blog',
    content: '',
    path: '',
    metadata: { ...config.content.defaultMetadata }
  });

  // 获取内容列表
  const fetchContents = async () => {
    try {
      const { data } = await octokit.repos.getContent({
        owner: user.login,
        repo: config.github.contentRepo,
        path: config.github.contentPath
      });
      setContents(data);
    } catch (error) {
      console.error('获取内容列表失败:', error);
    }
  };

  // 保存内容
  const handleSave = async () => {
    try {
      const content = Buffer.from(JSON.stringify({
        ...formData,
        metadata: {
          ...formData.metadata,
          lastModified: new Date().toISOString()
        }
      })).toString('base64');

      await octokit.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: config.github.contentRepo,
        path: `${config.github.contentPath}/${formData.path}`,
        message: `Update ${formData.title}`,
        content,
        sha: selectedContent?.sha
      });

      setDialogOpen(false);
      fetchContents();
    } catch (error) {
      console.error('保存内容失败:', error);
    }
  };

  // 删除内容
  const handleDelete = async (content) => {
    if (window.confirm('确定要删除这个内容吗？')) {
      try {
        await octokit.repos.deleteFile({
          owner: user.login,
          repo: config.github.contentRepo,
          path: content.path,
          message: `Delete ${content.name}`,
          sha: content.sha
        });
        fetchContents();
      } catch (error) {
        console.error('删除内容失败:', error);
      }
    }
  };

  // 获取模板图标
  const getTemplateIcon = (template) => {
    switch (template) {
      case 'blog':
        return <ArticleIcon />;
      case 'page':
        return <PageIcon />;
      case 'gallery':
        return <GalleryIcon />;
      default:
        return <ArticleIcon />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {t('contentManagement')}
        </Typography>
        <Fab color="primary" onClick={() => {
          setSelectedContent(null);
          setFormData({
            title: '',
            template: 'blog',
            content: '',
            path: '',
            metadata: { ...config.content.defaultMetadata }
          });
          setDialogOpen(true);
          setEditMode(true);
        }}>
          <AddIcon />
        </Fab>
      </Box>

      <Paper elevation={2}>
        <List>
          {contents.map((content) => (
            <ListItem
              key={content.sha}
              secondaryAction={
                <Box>
                  <IconButton onClick={() => {
                    setSelectedContent(content);
                    setFormData(JSON.parse(Buffer.from(content.content, 'base64').toString()));
                    setDialogOpen(true);
                    setEditMode(true);
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(content)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemIcon>
                {getTemplateIcon(JSON.parse(Buffer.from(content.content, 'base64').toString()).template)}
              </ListItemIcon>
              <ListItemText
                primary={JSON.parse(Buffer.from(content.content, 'base64').toString()).title}
                secondary={new Date(content.metadata?.lastModified).toLocaleDateString()}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editMode ? (selectedContent ? '编辑内容' : '新建内容') : '查看内容'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="标题"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={!editMode}
            />
            <FormControl>
              <InputLabel>模板</InputLabel>
              <Select
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                disabled={!editMode}
              >
                {config.content.templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="路径"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              disabled={!editMode}
              helperText="例如：blog/my-first-post.json"
            />
            <Box data-color-mode={darkMode ? 'dark' : 'light'}>
              <MDEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                preview={editMode ? 'edit' : 'preview'}
                height={400}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            取消
          </Button>
          {editMode && (
            <Button
              onClick={handleSave}
              variant="contained"
              startIcon={<SaveIcon />}
            >
              保存
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPage;