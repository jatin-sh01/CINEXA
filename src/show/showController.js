import showModel from "./showModel.js";
import createHttpError from "http-errors";
import theaterModel from "../theater/theaterModel.js";
import movieModel from "../movie/movieModel.js";
import bookingModel from "../booking/bookingModel.js";
import constants from "../utils/constants.js";
import { getSeatSnapshot, hydrateBookedSeats } from "../realtime/seatState.js";

function parseSeatIds(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((seat) => seat.trim())
    .filter(Boolean);
}

const createShow = async (req, res, next) => {
  try {
    // 1. Find the theater by ID
    const theater = await theaterModel.findById(req.body.theaterId);
    if (!theater) {
      return next(createHttpError(404, "Theater not found with this id"));
    }

    // 2. Check if the movie exists
    const movie = await movieModel.findById(req.body.movieId);
    if (!movie) {
      return next(createHttpError(404, "Movie not found with this id"));
    }

    // 3. Add movie to theater's movies array if not already present
    if (!theater.movies.map((id) => id.toString()).includes(req.body.movieId)) {
      theater.movies.push(req.body.movieId);
      await theater.save();
    }

    // 4. Create the show
    const show = await showModel.create(req.body);

    // 5. Respond with the created show
    res.status(201).json({
      success: true,
      message: "Show created successfully",
      data: show,
    });
  } catch (error) {
    console.error("Error creating show:", error);
    return next(createHttpError(500, "Failed to create show"));
  }
};

const updateShow = async (req, res, next) => {
  try {
    const show = await showModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!show) {
      return next(createHttpError(400, "show is not found "));
    }
    res.status(200).json({
      success: true,
      message: "succesfull update the booking ",
      data: show,
    });
  } catch (error) {
    console.error("error while updating the movie", error);
    return next(createHttpError(500, "error whille updating the resource"));
  }
};

const getShows = async (req, res, next) => {
  try {
    let filter = {};
    const data = req.query;
    if (req.query.theaterId) {
      filter.theaterId = data.theaterId;
    }
    if (req.query.movieId) {
      filter.movieId = data.movieId;
    }

    const show = await showModel.find(filter).populate('theaterId').populate('movieId');
    if (!show) {
      return next(createHttpError(400, "show not found"));
    }
    res.status(200).json({
      success: true,
      message: "succesfull fetch the show ",
      data: show,
    });
  } catch (error) {
    console.error("error while fetch the show", error);
    return next(createHttpError(500, "error whille fetch the resource"));
  }
};

const deleteShow = async (req, res, next) => {
  try {
    const activeBooking = await bookingModel.findOne({
      showId: req.params.id,
      status: {
        $in: [
          constants.BOOKING_STATUS.processing,
          constants.BOOKING_STATUS.successfull,
        ],
      },
    });

    if (activeBooking) {
      return next(
        createHttpError(
          409,
          "This show has active bookings. Cancel related bookings before deleting the show."
        )
      );
    }

    const show = await showModel.findByIdAndDelete(req.params.id);
    if (!show) {
      return next(createHttpError(404, "show not found "));
    }
    res.status(200).json({
      success: true,
      message: "succesfull delete the booking ",
      data: show,
    });
  } catch (error) {
    console.error("error while delete the show", error);
    return next(createHttpError(500, "error delete  the resource"));
  }
};

const getShowById = async (req, res, next) => {
  try {
    const show = await showModel.findById(req.params.id).populate('theaterId').populate('movieId');
    if (!show) {
      return next(createHttpError(404, "Show not found"));
    }

    const bookings = await bookingModel.find({
      showId: show._id,
      status: {
        $in: [
          constants.BOOKING_STATUS.processing,
          constants.BOOKING_STATUS.successfull,
        ],
      },
    });

    const bookedSeats = [
      ...new Set(bookings.flatMap((booking) => parseSeatIds(booking.seat))),
    ];

    hydrateBookedSeats(String(show._id), bookedSeats);
    const snapshot = getSeatSnapshot(String(show._id));

    res.status(200).json({
      success: true,
      message: "Show fetched successfully",
      data: {
        ...show.toObject(),
        bookedSeats,
        lockedSeats: snapshot.lockedSeatIds,
      },
    });
  } catch (error) {
    console.error("Error fetching show by id", error);
    return next(createHttpError(500, "Failed to fetch show"));
  }
};

export { createShow, updateShow, getShows, deleteShow, getShowById };
