import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
} from '@chakra-ui/react'
import { Layout } from '../../components/Layout'
import { getPost, updatePost } from '../../utils/github'

export default function EditPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sha, setSha] = useState('')
  const router = useRouter()
  const toast = useToast()
  const { path } = router.query

  useEffect(() => {
    if (path && typeof path === 'string') {
      loadPost(path)
    }
  }, [path])

  const loadPost = async (path: string) => {
    try {
      const { content, sha } = await getPost(path)
      setContent(content)
      setSha(sha)
      // 从文件名中提取标题
      setTitle(path.split('/').pop()?.replace('.md', '') || '')
    } catch (error) {
      toast({
        title: '加载失败',
        description: error.message,
        status: 'error',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const filePath = `content/posts/${title}.md`
      await updatePost(
        filePath,
        content,
        sha ? `Update ${title}` : `Create ${title}`,
        sha
      )
      toast({
        title: '保存成功',
        status: 'success',
      })
      router.push('/admin')
    } catch (error) {
      toast({
        title: '保存失败',
        description: error.message,
        status: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <Box as="form" onSubmit={handleSubmit}>
        <FormControl mb={4}>
          <FormLabel>标题</FormLabel>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel>内容</FormLabel>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            minH="500px"
            required
          />
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          isLoading={isLoading}
        >
          保存
        </Button>
      </Box>
    </Layout>
  )
} 