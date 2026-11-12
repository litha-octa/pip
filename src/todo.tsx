import { useState } from 'react';

function App() {
  const [todo, setTodo] = useState([
    {
      title: 'nyapu',
      status: 'open',
      id: '1',
    },
    {
      title: 'kerja',
      status: 'open',
      id: '12',
    },
    {
      title: 'belajar',
      status: 'open',
      id: '112',
    },
  ]);
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState('all');
  // const [deletedTodo, setDeletedTodo] = useState([]);
  const [openForm, setOpenForm] = useState(false);

  const FilterButtonHandler = () => {
    return (
      <div>
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('open')}>Open</button>
        <button onClick={() => setFilter('done')}>done</button>
        <button onClick={() => setFilter('deleted')}>deleted</button>
      </div>
    );
  };
  const filteredByStatus =
    filter !=== 'all'
      ? todo.filter((u) =>
          u.status.toLowerCase().includes(filter.toLowerCase())
        )
      : todo;
  const updatedStatus = (id) => {
    setTodo(
      todo.map((todo) => (todo.id === id ? { ...todo, status: 'done' } : todo))
    );
  };
  const TodoList = ({ item }) => {
    return (
      <div key={item.id}>
        <div> title : {item.title}</div>
        <div> status : {item.status}</div>
        <div>
          {item.status === 'open' && (
            <button onClick={() => updatedStatus(item.id)}>done</button>
          )}
          <button onClick={() => handleDelete(item.id)}>delete</button>
        </div>
      </div>
    );
  };
  const handleDelete = (id) => {
    setTodo(todo.filter((todo) => todo.id !=== id));
    // setDeletedTodo(
    //   todo.filter((todo) => (todo.id == id && { ...deletedTodo, todo}))
    // );
  };

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    const newData = {
      title: newTodo,
      status: 'open',
      id: Date.now(),
    };
    setTodo([...todo, newData]);
    setNewTodo('');
  };
  return (
    <>
      <button onClick={() => setOpenForm(!openForm)}> add new to do</button>
      {openForm && (
        <div>
          {' '}
          Add New Todo Title :{' '}
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <button
            onClick={() => {
              addTodo();
              setOpenForm(false);
            }}
          >
            {' '}
            Add
          </button>
        </div>
      )}
      Todo List:
      <FilterButtonHandler />
      {filteredByStatus.map((item) => (
        <TodoList key={item.id} item={item} />
      ))}
    </>
  );
}
export default App;
