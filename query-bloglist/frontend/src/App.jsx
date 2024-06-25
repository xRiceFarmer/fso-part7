import { useState, useEffect } from 'react'
import Blog from './components/Blog'
import BlogDetail from './components/BlogDetail'
import blogService from './services/blogs'
import Notification from './components/Notification'
import Togglable from './components/Togglable'
import BlogForm from './components/BlogForm'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from './contexts/NotificationContext'
import LoginForm from './components/LoginForm'

import { useUser } from './contexts/UserContext'

import UserList from './components/UserList'

import { Routes, Route, Link, useMatch, useNavigate } from 'react-router-dom'

import { Navbar, Container, Nav } from 'react-bootstrap'

const App = () => {
  const [notification, setNotification] = useNotification()
  const { state, dispatch } = useUser()
  const { user } = state
  const navigate = useNavigate()

  const queryClient = useQueryClient()

  const newBlogMutation = useMutation({
    mutationFn: blogService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] })
    }
  })

  const {
    data: blogs,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['blogs'],
    queryFn: async () => {
      const blogs = await blogService.getAll()
      return blogs.sort((a, b) => b.likes - a.likes)
    }
  })

  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem('loggedBlogUser')
    if (loggedUserJSON) {
      const user = JSON.parse(loggedUserJSON)
      dispatch({ type: 'SET_USER', payload: user })
      blogService.setToken(user.token)
    }
  }, [dispatch])

  const handleLogout = (event) => {
    window.localStorage.removeItem('loggedBlogUser')
    dispatch({ type: 'CLEAR_USER' })
    navigate("/")
  }

  const createBlog = async (blogObject) => {
    try {
      await newBlogMutation.mutateAsync(blogObject)
      const messageObject = {
        text: `a new blog ${blogObject.title} by ${blogObject.author} added`,
        type: 'success'
      }
      setNotification(messageObject)
    } catch (error) {
      const messageObject = {
        text: error.response.data.error,
        type: 'error'
      }
      setNotification(messageObject)
    }
  }
  const handleLikes = async (id) => {
    const likedBlog = blogs.find((blog) => blog.id === id)
    if (!likedBlog) {
      console.log('error finding blog')
      return
    }
    const updatedBlog = {
      ...likedBlog,
      likes: likedBlog.likes + 1
    }
    try {
      await blogService.update(id, updatedBlog)
      queryClient.invalidateQueries({ queryKey: ['blogs'] })
    } catch (error) {
      console.log('Error updating likes', error)
    }
  }

  const deleteBlog = async (id) => {
    const blogToDelete = blogs.find((blog) => blog.id === id)
    if (!blogToDelete) {
      console.log('Error finding blog')
      return
    }
    const confirmDelete = window.confirm(
      `Remove blog ${blogToDelete.title} by ${blogToDelete.author}?`
    )
    if (confirmDelete) {
      try {
        await blogService.remove(id)
        queryClient.invalidateQueries({ queryKey: ['blogs'] })
        navigate('/')
        setNotification({
          text: `Blog ${blogToDelete.title} deleted`,
          type: 'success'
        })
      } catch (error) {
        setNotification({ text: error.message, type: 'error' })
      }
    }
  }

  const match = useMatch('/blogs/:id')
  const blog = match ? blogs?.find((blog) => blog.id === match.params.id) : null

  if (!user) {
    return <LoginForm/>
  }
  if (isLoading) {
    return <div>Loading...</div>
  }

  if (isError) {
    return <div>Error fetching blogs</div>
  }

  return (
    <div className='container'>
      <Navbar expand="lg" className="bg-body-tertiary">
        <Container>
          <Navbar.Brand to="/">
          Blog App
          </Navbar.Brand>    
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className='me-auto'>
              <Nav.Link as={Link} to="/">
                Home
              </Nav.Link>
              <Nav.Link as={Link} to="/users">
                Users
              </Nav.Link>
              <Nav.Link href="">
                {
                  user
                  ? <div>
                  <em>{user.name} logged in</em>
                  <button onClick={handleLogout}>logout</button>
                </div>
                : <div>Login</div>
                }
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Notification message={notification} />
      <Routes>
        <Route path="/users/*" element={<UserList />} />
        <Route
          path="/"
          element={
            <>
              <Togglable buttonLabel="new blog">
                <BlogForm createBlog={createBlog} />
              </Togglable>
              {blogs && <Blog blogs={blogs}/>}
            </>
          }
        />
        <Route
          path="/blogs/:id"
          element={
            blog && <BlogDetail blog={blog} showRemove={blog.user.name === user.name} handleLikes={handleLikes} deleteBlog={deleteBlog} setNotification={setNotification}/>
          }
        />
      </Routes>
    </div>
  )
}

export default App
