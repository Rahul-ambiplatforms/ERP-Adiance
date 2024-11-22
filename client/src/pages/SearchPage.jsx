import React, { useEffect, useState } from 'react';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useLocation } from 'react-router-dom';
import noDataImage from '../assets/nothing here yet.webp';

const SearchPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadingArrayCard = new Array(10).fill(null); // Placeholder loading array
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const params = useLocation();
  const searchText = params?.search?.slice(3);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        ...SummaryApi.searchProduct,
        data: {
          search: searchText,
          page: page,
        },
      });

      const { data: responseData } = response;

      if (responseData.success) {
        if (responseData.page === 1) {
          setData(responseData.data);
        } else {
          setData((prev) => [...prev, ...responseData.data]);
        }
        setTotalPage(responseData.totalPage);
        console.log(responseData);
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, searchText]);

  const handleFetchMore = () => {
    if (totalPage > page) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <section className="bg-white">
      <div className="container mx-auto p-4">
        <p className="font-semibold">Search Results: {data.length}</p>

        <InfiniteScroll
          dataLength={data.length}
          hasMore={totalPage > page}
          next={handleFetchMore}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 py-4 gap-4">
            {data.map((p, index) => (
              <div
                key={p?._id + 'searchProduct' + index}
                className="p-4 border rounded shadow-md"
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-32 object-cover"
                />
                <h4 className="font-bold text-sm mt-2">{p.name}</h4>
                <p className="text-gray-500 text-xs">{p.description}</p>
              </div>
            ))}

            {/* Loading Placeholders */}
            {loading &&
              loadingArrayCard.map((_, index) => (
                <div
                  key={'loadingsearchpage' + index}
                  className="p-4 border rounded shadow-md animate-pulse"
                >
                  <div className="w-full h-32 bg-gray-300"></div>
                  <div className="mt-2 h-4 bg-gray-300 w-3/4"></div>
                  <div className="mt-1 h-4 bg-gray-300 w-1/2"></div>
                </div>
              ))}
          </div>
        </InfiniteScroll>

        {/* No Data Message */}
        {!data[0] && !loading && (
          <div className="flex flex-col justify-center items-center w-full mx-auto">
            <img
              src={noDataImage}
              className="w-full h-full max-w-xs max-h-xs block"
              alt="No Data"
            />
            <p className="font-semibold my-2">No Data Found</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchPage;
