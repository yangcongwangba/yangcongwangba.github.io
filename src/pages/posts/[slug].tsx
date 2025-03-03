import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Box, Heading } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import { Layout } from '../../components/Layout'
import { getPost } from '../../utils/github'

export default function PostPage() {
  const [post, setPost] = useState<{ content: string }>({ content: '' })
  const router = useRouter()
  const { slug } = router.query

  useEffect(() => {
    if (slug && typeof slug === 'string') {
      loadPost(slug)
    }
  }, [slug])

  const loadPost = async (slug: string) => {
    try {
      const { content } = await getPost(`content/posts/${slug}.md`)
      setPost({ content })
    } catch (error) {
      console.error('Failed to load post:', error)
      router.push('/404')
    }
  }

  return (
    <Layout>
      <Box className="markdown-body">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </Box>
    </Layout>
  )
} 