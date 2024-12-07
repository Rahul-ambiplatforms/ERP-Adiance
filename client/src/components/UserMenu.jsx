import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Divider from "./Divider";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import { logout } from "../store/userSlice";
import toast from "react-hot-toast";
import AxiosToastError from "../utils/AxiosToastError";
import { HiOutlineExternalLink } from "react-icons/hi";
import isAdmin from "../utils/isAdmin";

const UserMenu = ({ close }) => {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await Axios({
        ...SummaryApi.logout,
      });
      if (response.data.success) {
        if (close) {
          close();
        }
        dispatch(logout());
        localStorage.clear();
        toast.success(response.data.message);
        navigate("/");
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  const handleClose = () => {
    if (close) {
      close();
    }
  };

  return (
    <div>
      <div className="font-semibold">My Account</div>
      <div className="text-sm flex items-center gap-2">
        <span className="max-w-52 text-ellipsis line-clamp-1">
          {user.name || user.mobile}{" "}
          <span className="text-medium text-red-600">
            {user.role === "ADMIN" ? "(Admin)" : ""}
          </span>
        </span>
        <Link
          onClick={handleClose}
          to={"/dashboard/profile"}
          className="hover:text-primary-200"
        >
          <HiOutlineExternalLink size={15} />
        </Link>
      </div>

      <Divider />

      <div className="text-sm grid gap-1">
        {isAdmin(user.role) && (
          <>
            <Link
              onClick={handleClose}
              to={"/dashboard/adminpanel"}
              className="px-2 hover:bg-orange-200 py-1"
            >
              Dashboard
            </Link>

            <Link
              onClick={handleClose}
              to={"/dashboard/category"}
              className="px-2 hover:bg-orange-200 py-1"
            >
              Camera Category
            </Link>

            <Link
              onClick={handleClose}
              to={"/dashboard/subcategory"}
              className="px-2 hover:bg-orange-200 py-1"
            >
              Camera Parts
            </Link>

            <Link
              onClick={handleClose}
              to={"/dashboard/upload-product"}
              className="px-2 hover:bg-orange-200 py-1"
            >
              Inward Camera Part
            </Link>

            <Link
              onClick={handleClose}
              to={"/dashboard/out-product"}
              className="px-2 hover:bg-orange-200 py-1"
            >
              Outward Product
            </Link>

            <Link
              onClick={handleClose}
              to={"/dashboard/damage-product"}
              className="px-2 hover:bg-orange-200 py-1"
            >
              Manage Damage Product
            </Link>

            <Link
              onClick={handleClose}
              to={"/dashboard/ready-camera"}
              className="px-2 hover:bg-orange-200 py-1"
            >
              Ready Camera
            </Link>

            {/* Delivery Camera Button */}
            <Link
              onClick={handleClose}
              to={"/dashboard/camera-delivery"}
              className="px-2 hover:bg-orange-200 py-1"
            >
              Deliver Camera
            </Link>
          </>
        )}

        <button
          onClick={() => setShowConfirmLogout(true)}
          className="text-left px-2 hover:bg-orange-200 py-1"
        >
          Log Out
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmLogout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-80">
            <h2 className="text-lg font-semibold mb-4">Confirm Logout</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-between">
              <button
                onClick={() => setShowConfirmLogout(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
              >
                No
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
