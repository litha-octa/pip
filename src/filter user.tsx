import { useEffect, useState } from 'react';
import './App.css';

type DataListProps = { name: string; email: string; company: string };

function App() {
  const url = 'https://jsonplaceholder.typicode.com/users';
  const [user, setUser] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [isError, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const ErrorHandler = (msg) => {
    return <>Error found : {msg}</>;
  };
  const LoadingHandler = () => {
    return <>Data Loading ....</>;
  };
  const DataList = ({ name, email, company }: DataListProps) => {
    return (
      <>
        <div>
          {' '}
          Name : {name} - {email}
        </div>
        <div> Company Name : {company}</div>
      </>
    );
  };
  const getData = async () => {
    setLoading(true);
    try {
      const response = await fetch(url);
      if (response) {
        const data = await response.json();
        console.log(data, 'datataa');
        setUser(data);
      }
    } catch (err) {
      console.log(err);
      setError(true);
      setErrorMsg(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getData();
  }, []);
  const filteredUsers = user.filter((u) =>
    u.name.toLowerCase().includes(keyword.toLowerCase())
  );
  return (
    <>
      <div>
        <h2>Daftar Pengguna</h2>
        <input
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
          }}
        />
        {isLoading && <LoadingHandler />}
        <ul>
          {user ? (
            filteredUsers.map((user) => (
              <li key={user.id}>
                <DataList
                  name={user.name}
                  email={user.email}
                  company={user.company.name}
                />
              </li>
            ))
          ) : (
            <div>data tidak ditemukan</div>
          )}
        </ul>
        {isError && <ErrorHandler msg={errorMsg} />}
      </div>
    </>
  );
}

export default App;
