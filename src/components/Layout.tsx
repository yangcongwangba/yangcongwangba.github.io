import { ReactNode } from 'react'
import { Box, Container, Flex, Heading, HStack, Link } from '@chakra-ui/react'
import NextLink from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import { Auth } from './Auth'
import { siteConfig } from '../config/site.config'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <Box minH="100vh">
      <Box as="header" py={4} borderBottomWidth={1}>
        <Container maxW="container.lg">
          <Flex justify="space-between" align="center">
            <NextLink href="/" passHref>
              <Link _hover={{ textDecoration: 'none' }}>
                <Heading size="lg">{siteConfig.title}</Heading>
              </Link>
            </NextLink>

            <HStack spacing={4}>
              {siteConfig.nav.map(item => (
                <NextLink key={item.path} href={item.path} passHref>
                  <Link>{item.name}</Link>
                </NextLink>
              ))}
            </HStack>

            <HStack spacing={2}>
              <ThemeToggle />
              <Auth />
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container as="main" maxW="container.lg" py={8}>
        {children}
      </Container>

      <Box as="footer" py={8} borderTopWidth={1} textAlign="center">
        © {new Date().getFullYear()} {siteConfig.title}. Powered by GitHub Pages.
      </Box>
    </Box>
  )
} 